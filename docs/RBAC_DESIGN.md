# RBAC Design — Rose Click

Status: **accepted — Phase 1 implemented in rc-api** · Author: Claude (with Navaneeth) · Date: 2026-07-11

**Decisions made 2026-07-11 (product owner):**
- Co-host: full settings editing, guest management (remove/block), co-host
  inviting. NOT: archive/close event, delete, transfer — those are creator-only.
- Guest: view + upload (event toggles permitting) + see other participants.
  Downloads governed purely by the event's download toggle (opt-in).
- **No per-user overrides** — the three roles are the only granularity. This
  removes the overrides machinery from the plan entirely (§3.3 simplified).
Scope: event-level access control across `rc-api` and `rc-frontend`.

---

## 1. Why now

A guest account was able to open Event Settings and only failed with a raw 403
at save time. The immediate bug (stale persisted role on the client) is fixed,
but the audit it triggered found structural problems that patches won't solve.

### What exists today (audit findings)

| # | Finding | Where | Consequence |
|---|---------|-------|-------------|
| 1 | Permissions are a **13-boolean blob copied onto each participant row at creation** | `event-participants.model.ts` `getDefaultPermissions()` | Policy changes never reach existing rows. Real drift found in prod data: a `creator` row with `can_manage_settings: false`. |
| 2 | **Three abandoned RBAC attempts** coexist | `access-controls` collection (Drive-style ACL, 2 test docs); `permission_overrides` ghost methods on the participant model (field not in schema); frontend `PermissionManager`/`RoleGuard` pointed at a `/api/events/:id/permissions` endpoint that does not exist | Nobody can tell which system is authoritative; none is. |
| 3 | **Two permission vocabularies** | Backend: 13 `snake_case` booleans. Frontend: 30-action `PermissionAction` enum with a full role matrix | Checks can't be shared or compared; frontend matrix is dead code. |
| 4 | **Scattered enforcement** | `checkUpdatePermission()` re-queries the participant the middleware already fetched; `req.user.role === 'guest'` string checks; `eventAccessMiddleware` builds a rich `req.eventAccess` that controllers then ignore | Every new endpoint invents its own check; misses are invisible. |
| 5 | Client-side gating read **persisted localStorage role** | fixed 2026-07-11 via `useEventRole` | Was the symptom that started this. |

The three roles themselves (creator / co_host / guest) are **not** the problem.
Market research (`docs/MARKET_RESEARCH.md` §roles) confirms three roles cover
the product; the gap is *how* permissions are derived, stored, and enforced.

---

## 2. How the industry does it

### Google Drive (the model the user asked about)

Drive's permission system, per the public API:

- A **small fixed set of roles**: `owner`, `organizer`, `fileOrganizer`,
  `writer`, `commenter`, `reader`. Roles are **policy defined in code/docs** —
  what a `writer` can do is never stored per user; only the *role assignment*
  is stored.
- Each file/folder has **permission entries**: `{ type: user | group | domain
  | anyone, role, expirationTime? }`. "Anyone with the link can view" is
  literally an entry `{ type: anyone, role: reader }` — **a link is a grant
  with a role**, not a special code path.
- Certain actions are **hard role gates**, not permissions: only `owner` can
  delete or transfer; sharing rules change per context (`writersCanShare`).
- Folder permissions **propagate downward** (inheritance).

### Zanzibar / ReBAC (Google's internal engine, OpenFGA/SpiceDB open-source)

Google internally runs Drive/YouTube/Cloud authorization on Zanzibar —
relationship tuples (`user:anne is writer of doc:readme`) evaluated by a
dedicated service. The 2025/26 industry consensus for B2B SaaS is a **hybrid**:
RBAC for coarse role gates, ReBAC only once you need per-resource sharing
graphs ("Alice can edit Album X but not Album Y", nested inheritance). Adopting
a tuple engine (OpenFGA, SpiceDB, Permify) before that need exists buys
operational cost with no benefit.

### The pattern that fits Rose Click's scale

> **Small role set + centralized policy matrix (code) + sparse per-user
> overrides (data) + links as scoped grants. Effective permissions are always
> computed at check time, never persisted.**

This is Drive's model minus the tuple engine, and it is exactly what attempts
#2 (overrides) and #3 (frontend matrix) were each half-building.

---

## 3. Target architecture

### 3.1 Concepts

```
Principal      = user account | guest session          (already unified in event_participants)
Role           = creator | co_host | guest             (stored — the assignment)
Policy         = ROLE_POLICY[role] → Set<Action>       (code — single module, versioned in git)
Link grant     = share_token → { role: guest, pin?, expires_at?, is_active }   (already exists; formalized)
Event settings = host-configured guest defaults        (event.permissions — product settings, not RBAC)

effective(participant) = ROLE_POLICY[participant.role]                // pure role policy (no overrides — decided)
effective(guest)      ∧= event.permissions                            // event-level guest switches
```

Implemented in `rc-api/src/configs/permissions.policy.ts` (actions + matrix +
`effectivePermissions()`), enforced by `rc-api/src/middlewares/authorize.middleware.ts`.

The last line is important: the Settings-page toggles (`can_upload`,
`can_download`, media types, approval) are **not RBAC** — they parameterize
what the *guest role means in this event*, exactly like Drive's
`writersCanShare`. Keep them on the event document where they already live.

### 3.2 One action vocabulary (shared FE/BE)

Namespaced strings, one source file mirrored in both repos (or a tiny shared
package later):

```ts
// permissions/actions.ts  — identical file in rc-api and rc-frontend
export const ACTIONS = [
  'event.view', 'event.update', 'event.delete', 'event.transfer', 'event.archive',
  'event.settings.manage',
  'media.view', 'media.upload', 'media.download', 'media.bulk_download',
  'media.approve', 'media.delete', 'media.hide',
  'participants.view', 'participants.invite', 'participants.remove',
  'participants.role.update', 'participants.permissions.update',
  'share.link.manage', 'share.wall.manage',
  'album.create', 'album.update', 'album.delete',
  'analytics.view', 'data.export',
] as const;
export type Action = typeof ACTIONS[number];

export const ROLE_POLICY: Record<Role, ReadonlySet<Action>> = { /* matrix */ };
```

Replaces both the 13 backend booleans and the 30-action frontend enum. The
existing frontend matrix in `constants/permissions.ts` is the starting point —
rename actions, delete unused ones.

**Hard creator gates** (Drive keeps delete/transfer owner-only the same way):
`event.delete`, `event.transfer`, and `event.archive` belong only to the
creator's policy set and are marked `isCreatorOnly()` so no future mechanism
can hand them out. Note: closing an event currently also rides through the
general `PATCH /event/:id` payload as `share_settings.is_active` — Phase 2
must gate that field inside the update path (payload-level check) or move it
to the dedicated `/archive` route, otherwise a co-host with `event.update` can
still archive.

### 3.3 Storage changes (MongoDB)

**`event_participants`** — simplified by the no-overrides decision:

```diff
  role: 'creator' | 'co_host' | 'guest'
- permissions: { can_view, can_upload, ... 13 booleans }     // DROP once no code reads it
```

- No migration script needed: with pure role policy there is nothing to
  preserve from the blobs. Once every route uses `authorize()` (Phase 2),
  remove the field, its schema, `getDefaultPermissions()`, and the ghost
  `grantPermission`/`revokePermission`/`permission_overrides` code.
- Drift rows (e.g. the `can_manage_settings:false` creator) heal automatically
  the moment blobs stop being read.

**Delete** the `access-controls` collection (2 orphan test docs) — its shape
(per-resource ACL) returns only if per-album sharing ships, see §5.

**`roles_master`** is a different axis (platform roles: rc-admin, rc-dash,
rc-cam access). Keep it out of event RBAC entirely.

### 3.4 Backend enforcement — one gate

```ts
// The middleware already fetches the participant; stop re-querying in controllers.
eventRouter.patch('/:event_id',
  eventAccessMiddleware,            // resolves participant → req.eventAccess
  authorize('event.update'),        // ONE way to gate an endpoint
  eventController.updateEventController
);

// authorize() reads req.eventAccess.can(action) — effective set computed once
// per request from ROLE_POLICY[role] ⊕ overrides. No extra DB round-trip.
```

Kill list: `checkUpdatePermission()`, ad-hoc `req.user.role === 'guest'`
checks, the per-boolean fields on `req.eventAccess` (replace with
`can(action)` + `role`).

Token routes (`/guest/:token`, `/wall/:token`) map to the same system: a valid
share token resolves to `role: guest` scoped by the token type (wall tokens →
`media.view` only) — links are grants, as in Drive.

### 3.5 The my-access endpoint (single client source of truth)

```
GET /api/v1/event/:event_id/my-access
→ { role: 'co_host', permissions: ['event.view','event.update', ...], policy_version: 3 }
```

- Computed server-side with the exact same `effective()` function the
  middleware uses — client and server can never disagree.
- Replaces the dead TODO fetch in `PermissionContext.tsx`; `RoleGuard` /
  `AdminGuard` / `usePermissionCheck` become functional with **no other
  changes** — they were built for exactly this payload.
- Cached per event in React Query; invalidated by the already-emitted
  `permission_updated` WebSocket event (the plumbing exists on both sides).
- `useEventRole` stays as the cheap synchronous check for nav chrome (it needs
  no fetch); everything else uses `can(action)`.

### 3.6 Frontend usage after wiring

```tsx
// Route gate (already written, currently dead — comes alive with 3.5):
<AdminGuard redirectTo={`/events/${eventId}`}> <SettingsPage/> </AdminGuard>

// Feature gate:
const { allowed: canDelete } = usePermissionCheck('event.delete');
{canDelete && <DeleteEventButton/>}
```

Client checks remain **UX only**; the server is always the enforcer.

---

## 4. Rollout plan (each phase ships independently)

| Phase | Work | Status / Risk |
|-------|------|------|
| **1. Policy core (backend)** | `configs/permissions.policy.ts` (actions + matrix + `effectivePermissions()`), `attachPolicy()` in both access middlewares, `authorize()` middleware, `GET /event/:id/my-access`, first adoption on `PATCH /event/:id`. | **Done 2026-07-11** (additive) |
| **2. Route adoption** | **Done 2026-07-12.** Event router fully converted; media/album id-scoped routes gated via `resource-access.middleware.ts` (resolves resource→event, delegates to eventAccessMiddleware); `cohost.manage` action added (creator-only) and gates `PATCH /cohosts/:user_id` — that route previously had NO caller check at all; legacy guards (`checkUpdatePermission`, `participant-access.middleware`, `requireGuestManagementAccess`, guest string checks) deleted. Upload-status/retry routes left as uploader-scoped flows. | **Done** |
| **3. Blob removal** | **Request path is blob-free (2026-07-12):** `attachPolicy()` overwrites all legacy `req.eventAccess.can*` booleans from computed policy; service-internal blob checks (event-core delete/update, cohost participant-management, auto-approve) converted to role checks. **Remaining:** participant APIs still *return* the blob (`participant.service` responses) and `updateParticipantController` still accepts `permissions` edits (vestigial under no-overrides — needs a Guests-page product call), then drop the schema field + `getDefaultPermissions()` + ghost methods. | Request path done; schema drop pending |
| **4. Frontend wiring** | Done 2026-07-12: `constants/permissions.ts` = exact backend action mirror (no client matrix); `PermissionManager` = thin wrapper over server-granted set; `PermissionContext` fetches `getMyAccess()` (real endpoint) and refetches on WS `permission_updated`; provider mounted via new `app/events/[eventId]/layout.tsx`; danger zone (close/reopen + delete) now creator-only in UI. `useEventRole` remains for sync nav gating. | **Done 2026-07-12** |
| **5. Product unlocks** | Per-function co-hosts (add optional `scope` to participant — see §5). | New features |

---

## 5. Deliberate non-choices & future triggers

- **No authorization engine now** (Casbin, Oso, Cerbos, OpenFGA, SpiceDB): a
  3-role, ~25-action, single-resource-type policy fits in one reviewed TS
  module. An engine adds infra, latency, and a learning curve with zero
  current payoff.
- **Trigger to revisit — per-album/function sharing**: when "co-host of the
  sangeet function only" or "share album X with person Y" ships, permissions
  become *relationships between resources*. Then either resurrect the
  `access-controls` shape (per-resource grant rows: `{resource, principal,
  role, scope}`) or adopt **OpenFGA/SpiceDB** — the migration is natural
  because roles/actions defined here map 1:1 onto relation tuples.
- **DPDP note**: face-search and download consent are consent flags, not
  permissions — keep them out of this system (per CLAUDE.md privacy rules).

## 6. References

- Google Drive roles & sharing model: https://developers.google.com/workspace/drive/api/guides/ref-roles · https://developers.google.com/workspace/drive/api/guides/manage-sharing
- Zanzibar explained: https://authzed.com/learn/google-zanzibar · Drive-on-Zanzibar modeling: https://www.aserto.com/blog/google-zanzibar-drive-rebac-authorization-model · https://openfga.dev/docs/modeling/advanced/gdrive
- RBAC vs ReBAC decision guidance: https://www.osohq.com/academy/relationship-based-access-control-rebac · https://www.aserto.com/blog/rbac-vs-rebac
