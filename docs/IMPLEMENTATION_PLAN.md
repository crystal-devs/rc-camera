# Implementation Plan — Rose Click (rc-frontend + rc-api)

**Prepared:** June 2026 · Companion to `docs/MARKET_RESEARCH.md` (§5 improvements, §6 positioning, §7 casual segment)

> Everything in "Current state" was verified by reading the code in both repos. Items that could not be fully verified are explicitly marked **[verify]**. File paths reference `rc-frontend` unless prefixed `rc-api/`.

---

## 1. Current architecture (verified)

### Frontend (rc-frontend)
- Next.js 15 App Router, React 19, TS 5; React Query + Zustand; Dexie offline upload queue (`src/lib/guest/`); socket.io client (`src/stores/webSocketStore.ts`); ImageKit for delivery.
- Token-based guest routes (no login): `guest/[token]`, `join/[token]`, `join-cohost/[token]`, `share/[token]`, `wall/[shareToken]`.
- Roles: **3 roles** in `src/types/roles.ts` (`creator`, `co_host`, `guest`) with `parseRole()` mapping legacy strings; permission checks via `src/lib/permissions/PermissionManager.ts`.

### Backend (rc-api)
- Express 4 + TS, Mongoose 8 (MongoDB), Redis (cache + BullMQ + socket.io redis-adapter), node-cron, SSE + socket.io.
- **Security already in place:** helmet (`src/configs/security.config.ts`), extensive per-route rate limiters (auth, media, upload, bulk ops, bulk download), CSRF middleware, JWT via `tokenService` + refresh sessions (`refresh-session.model.ts`), share-token validation middleware, event/participant access middlewares.
- **Upload pipeline:** presigned S3 PUT (`upload-url.controller.ts`) → client uploads direct to S3 → `upload-complete.controller.ts` creates Media doc → WebSocket broadcast to `admin_{eventId}` / `guest_{eventId}` rooms. sharp generates variants; CloudFront URL util for delivery.
- **Face recognition (already built):** AWS Rekognition with one collection per event (`event_{eventId}`), BullMQ queue + worker rate-limited to 5 jobs/sec, `SearchFacesByImage` selfie search at threshold 90 (`rc-api/src/services/aws/rekognition.service.ts`, `workers/rekognition.worker.ts`, `controllers/media/search-faces.controller.ts`).
- **Guest sessions:** `guest-session.model.ts` — session id, `aws_face_id` + `selfie_url` (face login), device fingerprint, network info, upload stats, status (`active/claimed/expired/blocked/partially_claimed`), claim flow (`guest-claim.api.ts` on frontend).
- **Monetization scaffolding exists:** `subscription-plan`, `user-subscription`, `user-usage`, `transaction` models + `subscription-limit.middleware.ts`.
- **Event model** (`rc-api/src/models/event.model.ts`): `template` enum **already includes** `wedding | birthday | concert | corporate | vacation | custom`; `visibility` (`anyone_with_link | invited_only | private`); `share_token` + `share_settings` (password, `expires_at`); `permissions` (can_view/can_upload/can_download, require_approval, max_file_size_mb); `photowall_settings`; denormalized `stats`.

---

## 2. Gap analysis (verified discrepancies)

| # | Gap | Evidence | Severity |
|---|---|---|---|
| G1 | **Role enum mismatch**: backend allows 5 roles (`creator, co_host, moderator, guest, viewer` in `event-participants.model.ts`) vs frontend's 3. Frontend `parseRole()` silently maps `moderator→co_host`, `viewer→guest`, so a backend `moderator` gets co-host UI affordances | `rc-api/src/models/event-participants.model.ts:67` vs `src/types/roles.ts` | High — permission drift |
| G2 | **Face indexing has no consent gate**: every uploaded image is queued for `IndexFaces` unconditionally | `rc-api/src/controllers/upload-complete.controller.ts:144-151` | High — DPDP exposure (biometric processing without consent) |
| G3 | **No biometric deletion path**: zero occurrences of `DeleteCollection`/`DeleteFaces` in rc-api; collections live forever | grep across `rc-api/src` | High — DPDP purpose-limitation violation; also unbounded AWS cost |
| G4 | **No multi-function event structure**: event model is flat; Indian weddings need haldi/sangeet/wedding/reception sub-events | `event.model.ts` | Medium — core differentiator missing |
| G5 | **Templates exist but don't drive UX**: backend enum exists; no evidence the create flow presets permissions per template, and no `trip` preset surface in frontend | `event.model.ts:98-104` | Medium |
| G6 | **No WhatsApp integration** anywhere in either repo | grep | Medium — competitive gap vs Samaro |
| G7 | **No media auto-expiry**: `share_settings.expires_at` expires the *link*, not the media; no TTL/cleanup job for event media found **[verify** — `cleanup-lambda-backend-orchestrator.js` exists at rc-api root; confirm its scope before building anew**]** | `event.model.ts` | Low-Medium |
| G8 | **No PWA share target / manifest work** in frontend for "share from gallery → Rose Click" | no `share_target` in repo | Medium for casual segment |

---

## 3. Phased plan

### Phase 0 — Foundation: role alignment + biometric compliance (do first; everything depends on it)

**0.1 Unify the role system (G1)**
- Decide: 3 roles is the product truth (per CLAUDE.md). Backend: narrow `event-participants.model.ts` enum to `creator | co_host | guest`, with a migration script mapping existing `moderator→co_host`, `viewer→guest` documents (mirror frontend `parseRole()` exactly so both sides agree).
- Keep the existing per-participant `permissions` override schema — it's the right mechanism for template-driven defaults (Phase 1) without inventing new roles.
- Add a backend integration check: participant role values must round-trip through frontend `parseRole()` unchanged.
- *Security:* removes silent privilege mapping; one source of truth on the server (never trust client role claims — `event-access.middleware.ts` / `participant-access.middleware.ts` stay authoritative).

**0.2 Consent-gated face recognition (G2) — DPDP**
- Add to event model: `face_recognition: { enabled: boolean (default false), consent_version: string }` — host opts the *event* in at creation (template-dependent default: weddings prompt, birthdays/trips default off).
- Add to guest session: `face_consent: { given: boolean, at: Date, version: string, withdrawn_at: Date|null }`. The existing selfie flow (`aws_face_id`) becomes the explicit opt-in act, with plain-language consent copy (DPDP: free, specific, informed, unambiguous).
- Gate `upload-complete.controller.ts`: only call `queueIndexFaces` when `event.face_recognition.enabled`. This is a ~5-line change at the call sites (lines 145, 304) plus the schema field.
- Frontend: consent screen component in the guest selfie flow; "withdraw consent" in guest settings → calls a new endpoint that deletes the guest's `aws_face_id` via Rekognition `DeleteFaces` and nulls `selfie_url`.

**0.3 Biometric lifecycle / deletion (G3) — DPDP + cost control**
- Implement in `rekognition.service.ts`: `deleteCollection(eventId)` and `deleteFaces(faceIds, eventId)` (AWS SDK commands `DeleteCollectionCommand`, `DeleteFacesCommand` — already available in `@aws-sdk/client-rekognition`).
- Add `face_data_retention_days` to event model (default e.g. 60 after `end_date`); node-cron job (cron infra already in rc-api) deletes expired collections and clears `aws_face_id` on guest sessions. Log deletions to `activity-log.model.ts` for auditability.
- Delete collection immediately on event deletion (creator-only action — enforce via existing role middleware).
- *Cost note:* Rekognition bills for face storage in collections **[verify current AWS pricing]**; auto-deletion bounds this.

**0.4 Security hardening pass (existing surface)**
- **[verify]** presigned-URL constraints in `upload-url.controller.ts`: enforce content-type allowlist, max size (from `permissions.max_file_size_mb`), and key namespacing per event/session so a guest can't overwrite others' objects.
- **[verify]** `share_settings.password` is hashed (bcryptjs is already a dependency) — if plaintext, fix with migration.
- Guest-session abuse: device fingerprint + per-session upload rate limit already partially exist (`guest-session.model.ts` fingerprint fields, rate limiters) — add per-session quota enforcement tied to `subscription-limit.middleware.ts` so a hostile guest can't exhaust a host's storage.
- Selfie search endpoint (`search-faces.controller.ts`) must be rate-limited per session (it takes arbitrary image buffers — it's effectively a biometric oracle; throttle hard, require active guest session for the event).

### Phase 1 — Casual-segment simplicity (birthday/trip; market research §7)

**1.1 Template-driven creation (G5)**
- Frontend: one-screen create (title + template picker + optional date) in `events/create`; everything else gets template defaults. Backend already stores `template` — add a server-side map template → default `permissions` + `visibility` + `face_recognition.enabled` (e.g., birthday/vacation: `can_upload: true`, `require_approval: false`, faces off; wedding: approval on, face prompt on). Server applies defaults so clients can't skip policy.
- Surface "vacation" as "Trip" in UI copy (enum value already exists — no schema change).
- Target: event created → QR/link visible in under 60 seconds.

**1.2 PWA + Web Share Target (G8)**
- Add web app manifest with `share_target` (files) so installed-PWA users on Android/Chrome can Share → Rose Click from their gallery; route the received files into the existing Dexie queue. iOS Safari does not support share target — in-page upload button remains the iOS path (test on real devices; treat as progressive enhancement).
- Service worker for offline shell of guest routes only (keep host dashboard out of SW scope initially to limit cache-invalidation complexity).
- *Performance:* guest route bundle budget — audit with `next build` output; no new heavy deps on guest pages (CLAUDE.md rule).

**1.3 Media auto-expiry option (G7)**
- Event-level `media_retention: { mode: 'keep' | 'expire', days: number }`. Cron job marks expired media, S3 lifecycle rule or batch delete cleans objects, "download before expiry" notification hooks into Phase 2 messaging. First **[verify]** what `cleanup-lambda-backend-orchestrator.js` already covers.
- *Scalability:* deletion in batches via BullMQ (queue infra exists) rather than cron-loop deletes, to avoid blocking and to survive restarts.

### Phase 2 — Multi-function events (G4; the India-native differentiator)

- **Schema (recommended):** new `sub_event` concept — either embedded array on event (`functions: [{ _id, name, date, venue, cover, share_token }]`) or a separate collection. **Recommendation: embedded array**, because functions are bounded (≤ ~10), always fetched with the event, and avoid N+1 lookups; media gets an optional `sub_event_id` field (indexed) for per-function galleries. Revisit only if per-function permissions grow complex.
- Media model: add nullable `sub_event_id`; gallery queries filter by it (extend `media-query-enhanced.service.ts`); existing single-gallery events are untouched (null = main gallery) — **backward compatible, no migration needed**.
- Per-function co-hosts: reuse `event-participants` `permissions` overrides with an optional `scope: { sub_event_ids: [] }` field rather than new roles — keeps the 3-role invariant.
- Frontend: function tabs on the guest gallery; per-function QR (each function can reuse the event share token + `?fn=` param, or own token — own token preferred so a function QR can't open other functions when host wants isolation).
- WebSocket rooms stay per-event (`guest_{eventId}`) with payload carrying `sub_event_id` — avoids room explosion; clients filter.

### Phase 3 — WhatsApp integration (G6)

- **Step 1 (no API, ship immediately):** share-intent links (`https://wa.me/?text=...`) with prefilled event link on every host/guest share surface. Pure frontend.
- **Step 2 (WhatsApp Business Platform):** "photos are ready" notifications and album-delivery messages require the WhatsApp Business API (Meta) with approved message templates and per-conversation pricing — **[verify current Meta pricing/policy before committing]**. Backend: new `services/messaging/` + BullMQ queue for sends (retry/backoff), phone numbers come from existing `guest_info.phone` — collect with explicit notice (DPDP: stated purpose).
- *Security:* phone numbers are personal data — encrypt at rest **[verify current field-level encryption posture in rc-api]**, never log them; opt-out honored in the messaging service, not the call sites.

### Phase 4 — Differentiator features (market research §6)

- **Morning-after host digest:** cron + existing `media-stats`/`stats` data → digest payload → WhatsApp/email. Mostly composition of existing data; build after Phase 3 messaging exists.
- **AI keepsake album:** builds on planned AI edit integration (`src/services/apis/ai.api.ts` exists as the frontend surface; `media-ai.model.ts` already stores tags/faces/safety flags). Best-shot selection can start as heuristics over existing data (resolution, faces_detected, safety_flags, dedupe by perceptual hash **[needs new backend capability]**) before any generative work.
- **Photographer mode (B2B):** bulk upload path already effectively exists (presigned + queue); add watermarking (sharp supports it) and proofing states on media approval workflow (approval states already exist).

---

## 4. Cross-cutting: security / performance / scalability requirements

**Security (every phase):**
1. Server-side authority: all permission decisions in rc-api middlewares; frontend `PermissionManager` is UX-only. (Already the pattern — keep it.)
2. Share/guest tokens: ensure generation uses crypto-grade randomness **[verify token generation in rc-api share-token service]**; tokens in URLs end up in chat logs — that's by design for guests, so scope tokens minimally (view/upload only; never management actions).
3. Rate limiting already comprehensive; extend to: selfie search (biometric oracle), guest session creation (enumeration/spam), WhatsApp send queue.
4. Uploaded content: `media-ai.model.ts` has `safety_flags` — wire moderation flags into approval flow so flagged media auto-holds for `require_approval` events. Don't run Rekognition moderation on events that disabled AI **[decision needed: is safety moderation separable from face consent? It is — DetectModerationLabels is not biometric — document this distinction in consent copy]**.
5. DPDP checklist per feature touching personal data: stated purpose, opt-in, withdrawal path, retention schedule, deletion audit log.

**Performance:**
1. Keep direct-to-S3 presigned uploads (no API-server proxying of media bytes) — already correct.
2. Guest gallery: cursor-based pagination (frontend infinite media query hook exists; ensure backend query uses indexed sort, not skip/offset **[verify in `media-query-enhanced.service.ts`]**).
3. Guest page payload budget: ImageKit/CloudFront variants for thumbnails (both exist — ensure gallery never loads originals for grid view **[verify frontend gallery components]**).
4. BullMQ for anything slow or third-party (Rekognition already does this; messaging, deletion batches, album generation follow the same pattern).

**Scalability:**
1. socket.io already uses the Redis adapter — API can scale horizontally; keep new realtime features room-based per event, payload-filtered (as in Phase 2 design), to avoid room explosion.
2. Rekognition: one collection per event is fine at current scale; the 5/sec BullMQ limiter protects against ThrottlingException; Phase 0.3 deletion keeps collection count bounded. AWS quota for collections **[verify current AWS limits if event volume exceeds ~thousands of concurrent active events]**.
3. MongoDB: hot collections (media, participants) already have compound indexes; any new query path (sub_event_id, expiry sweeps) must add a matching index in the same PR.
4. Stats denormalization on event (`stats.*`) is the right read-optimization; keep updates atomic (`$inc`) in upload/delete paths.

---

## 5. Sequencing summary

| Phase | Contents | Why this order |
|---|---|---|
| 0 | Role unification, consent-gated faces, biometric deletion, security verifications | Compliance + correctness debt; cheap now, expensive later; everything else builds on roles/consent |
| 1 | Template-driven 60-second create, PWA share target, media expiry | Casual-segment acquisition (the funnel) |
| 2 | Multi-function events | Biggest India-native differentiator; needs Phase 1 templates |
| 3 | WhatsApp share-intent → Business API | Distribution channel; Step 1 is nearly free |
| 4 | Digest, AI keepsake, photographer mode | Viral artifact + B2B revenue; depends on 1–3 infrastructure |
