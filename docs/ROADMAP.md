# Rose Click — Product Roadmap

Prepared 2026-07-13 · Owner: Navaneeth · Companion docs: `MARKET_RESEARCH.md`
(competitive analysis + sequencing rationale), `RBAC_DESIGN.md` (access-control
architecture), `MEDIA_PIPELINE_ARCHITECTURE.md`.

Grounding: every "we have / we lack" claim below was verified against the
rc-frontend / rc-api codebases on 2026-07-12, and Samaro claims come from
first-hand product screenshots (media manager, gallery designer, sharing,
create flow) reviewed the same day. Where a Samaro capability wasn't visible
in screenshots, we do not claim they lack it.

**Positioning guardrail** (`rose-click product vision`): win on *simple-first*,
the live wall, and effortless sharing. Samaro needs a 19-step product tour;
that is their weakness, not a spec to copy. Every item below must pass:
"does a first-time birthday host still understand the product without a tour?"
Pro features unlock progressively (wedding template), never by default.

---

## Current state (shipped)

- Settings redesign (Rompolo-inspired primitives) + server-driven RBAC
  (policy matrix, `authorize()` route gates, `my-access` endpoint) — 2026-07-12
- Face search (Rekognition selfie match), live photo wall, guest offline
  upload queue (Dexie), moderation queue with bulk approve, PIN + invited-only
  sharing, co-host invite flow, bulk downloads, QR generation, WhatsApp share
  message, subscription/storage limit plumbing

## Engineering hygiene track (continuous, small PRs)

From the RBAC rollout + code review — keep burning these down alongside
feature work:

- [ ] RBAC Phase 3 finish: stop returning/accepting the participant
      `permissions` blob, drop it from the schema (needs the Guests-page
      permission-toggle decision), delete legacy `can*` construction
- [ ] Converge client role gating on `my-access` (`PermissionContext`) and
      demote `useEventRole` to a loading hint; move it to React Query
- [ ] Implement the dedicated `/archive` route + point the danger zone at it
      (removes the payload special-case in the generic update)
- [ ] Middleware perf: field-project the Event fetch, drop per-request
      console.logs, pass the resolved event/role through the update path

---

## Phase 1 — Sub-events (multi-function structure) 🇮🇳

*Market research priority #3, sequencing item #1. Samaro has it (sub-event
filter in the media manager, per-sub-event "scene headers" in their designer);
we have zero backing model (verified: no sub_event anywhere in rc-api).*

- [ ] Data model: `sub_events` on the event (name, date, order); media carries
      `sub_event_id`; upload flows tag it (guest picker defaults to "the
      whole event" — casual events never see this)
- [ ] Host media manager: sub-event filter chips; guest gallery: sub-event
      section dividers
- [ ] Per-function co-host scope — the RBAC design (§5) reserved a `scope`
      field on participants for exactly this; policy stays unchanged
- [ ] Progressive disclosure: only the wedding template surfaces sub-events
      (per MARKET_RESEARCH §6 template logic)

## Phase 2 — WhatsApp-first delivery 🇮🇳

*Market research priority #5; "the single feature hosts cite most" for Samaro.
We only share a prefilled message today; Samaro runs upload + delivery through
WhatsApp.*

- [ ] WhatsApp Business API integration (rc-api service + templates)
- [ ] "Your photos are ready" delivery notification (post-event, and after
      face-match finds new photos of a guest)
- [ ] Host morning-after digest broadcast (MARKET_RESEARCH §6.5)
- [ ] Later: WhatsApp upload channel (guest sends photos to a number) — big
      lift, validate demand after delivery notifications ship

## Phase 3 — Media manager parity (host quality-of-life)

*Gaps verified against the new `media-gallery/` work-in-progress; Samaro
screenshots show all of these. Small, independent items — good gap-fillers
between the two big phases.*

- [ ] Multi-select in the host grid (Ctrl/Cmd + Shift ranges) wired to the
      existing bulk-status / bulk-delete / bulk-download APIs
- [ ] Favorites/likes on media (no field on the media model today) — powers
      curation + the future keepsake album
- [ ] Sort control (upload time / capture time) + filename search; person
      search already exists via face match — surface it in the same search box
- [ ] Guest vs Official (photographer) source split — model `source` on media
      at upload time; prerequisite for photographer mode later
- [ ] Per-role download quality (Samaro: co-host Original / guest 1600px) —
      resolution tiers in bulk-download + signed-URL paths; pairs with the
      "originals in, originals out" promise (research priority #1)
- [ ] Watermark/frame on view/download (photographer branding) — exists only
      in the print-shop path today

## Phase 4 — Sharing & appearance upgrades

- [ ] "All-Access" third link tier (full gallery, no PIN, for the client /
      close family) — fits the RBAC link-grant model (`RBAC_DESIGN.md` §3.1);
      today we have open-with-PIN or invited-only at event level
- [ ] Vanity URL slugs (`roseclick.app/nehas-birthday`) — token stays as the
      credential; slug is cosmetic routing
- [ ] QR customization (color, framed print sheet) — low effort, high
      perceived polish at the venue
- [ ] Live preview in create flow + Appearance tab (Samaro's best UI idea:
      palette/theme changes preview instantly); pair every palette with a
      light + dark variant
- [ ] Evaluate multiple galleries per event *only after* sub-events ship —
      per-function galleries likely cover the real need; five parallel
      galleries fails the simple-first test

## Phase 5 — The differentiators (ours, not parity)

*From MARKET_RESEARCH §6 — the share-bait artifacts nobody else delivers.*

- [ ] AI keepsake album ("The Family Album, not a feed"): chaptered by
      sub-event, best-shot selection, per-guest personalized version
- [ ] Morning-after host digest (top highlights, most-active guests, one-tap
      thank-you broadcast)
- [ ] Moment missions / capture prompts feeding the live wall
- [ ] Regional-language guest pages (guest surface is small; nobody localizes)
- [ ] Photographer mode (bulk upload, proofing, watermark) — B2B distribution
      wedge, after the Official/Guest split from Phase 3

---

## Explicitly not doing (with reasons)

- **19-step onboarding tour** — if we need one, the design failed. Invest in
  empty states and the first-run "create event" flow instead.
- **Cloning Samaro's 7-stage gallery designer** — our Appearance tab covers
  ~80% of the value; add live preview (Phase 4) rather than more knobs.
- **Per-participant permission toggles** — decided against (no-overrides RBAC,
  2026-07-11); the three roles + event-level guest switches are the model.

## DPDP guardrails (applies to Phases 2, 3, 5)

Face matching stays opt-in with consent withdrawal + deletion paths
(CLAUDE.md privacy constraints). WhatsApp identity collection (if we ever
require email/phone for "My Photos" like Samaro does) needs the same
consent-first treatment — collection toggles are a host convenience, not a
default.
