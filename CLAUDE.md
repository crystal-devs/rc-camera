# CLAUDE.md — Rose Click Frontend (rc-frontend)

Guidance for Claude Code when working in this repository.

## What this project is

Rose Click is an event photo-sharing platform for Indian events (weddings, functions, corporate events). Hosts create events, guests join via QR code / invite link and upload photos from the browser — no app install required. Ships as a responsive website and a PWA. Direct competitor reference: Samaro.ai, Kwikpic, Premagic (see `docs/MARKET_RESEARCH.md`).

## Commands

```bash
npm run dev      # Next.js dev server with Turbopack
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint (eslint-config-next)
```

No test runner is configured yet — do not invent `npm test`.

## Stack

- **Next.js 15** (App Router, `src/app/`) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + shadcn/ui (Radix primitives in `src/components/ui`), `class-variance-authority`, `tailwind-merge`, `framer-motion`, `lucide-react`, `next-themes` (light/dark)
- **State**: Zustand (`src/stores/`) for client state; TanStack React Query for server state; React Hook Form + Zod for forms
- **Realtime**: socket.io-client via `src/stores/webSocketStore.ts` (mutex-protected connection management)
- **Offline / upload queue**: Dexie (IndexedDB) — guest-side media upload and queue tracking in `src/lib/guest/`
- **Media**: ImageKit (`@imagekit/next`) for image delivery/optimization
- **Auth**: next-auth + Google OAuth (`@react-oauth/google`); token-based guest access (no login required for guests)
- **QR**: `qrcode.react` (generation), `@yudiel/react-qr-scanner` / `html5-qrcode` (scanning)

## Directory map

```
src/
  app/                 # Routes (App Router)
    events/[eventId]/  # Host event dashboard
    guest/[token]/     # Guest event page (token access, no login)
    join/[token]/      # Guest invite flow
    join-cohost/[token]/ # Co-host invite flow
    share/[token]/     # Public share links
    wall/[shareToken]/ # Live photo wall (projector/screen display)
    albums/, capture/, scan/, profile/, settings/, shop/
  components/          # Feature-organized (event, guest, photo, camera, photo-wall, guards, permissions, ...)
  services/apis/       # One API module per domain (events, media, guest, cohost, sharing, ai, ...)
  stores/              # Zustand stores (useEventStore, webSocketStore)
  lib/permissions/     # PermissionManager + PermissionContext
  lib/guest/           # Guest upload queue / offline logic
  types/roles.ts       # SINGLE SOURCE OF TRUTH for roles
  types/backend-types/ # Backend contract types
  hooks/, contexts/, providers/, utils/, constants/
```

## Role system (important)

`src/types/roles.ts` is the single source of truth. Three roles:

| Role | Enum value | Hierarchy | Notes |
|---|---|---|---|
| Event Creator | `creator` | 3 | Full control, only role that can delete the event |
| Co-Host | `co_host` | 2 | Manages participants, moderates content; cannot delete event or transfer ownership |
| Guest | `guest` | 1 | View/upload per event settings; token-based access, no account required |

- Always use `UserRole` enum, `parseRole()` (handles legacy strings like `owner`, `admin`, `moderator`), and `hasRolePrivilege()` — never compare raw role strings.
- Permission checks go through `src/lib/permissions/PermissionManager.ts` and `PermissionContext`, plus route guards in `src/components/guards/`.

## Conventions

- API calls live in `src/services/apis/*.api.ts` — one file per backend domain; add new endpoints there, not inline in components.
- Server data through React Query hooks; UI/client state through Zustand. Don't mix.
- Validate all forms with Zod schemas + `@hookform/resolvers`.
- Guest flows must work without login and degrade gracefully offline (Dexie queue) — never add an auth wall to `guest/`, `join/`, `share/`, or `wall/` routes.
- Mobile-first: guests are overwhelmingly on phones at events, often on poor venue Wi-Fi/4G. Keep guest pages light.
- Toasts via `sonner`; dates via `date-fns`.

## Privacy constraints (product requirement)

India's DPDP Act 2023 (rules notified Nov 2025, compliance deadline ~May 2027) applies. When touching anything related to face recognition, selfie matching, or personal data:
- Face/biometric features require explicit, specific, opt-in consent — never opt-out defaults.
- Provide consent withdrawal and data deletion paths.
- Don't add tracking/behavioral features targeting children.
See `docs/MARKET_RESEARCH.md` § Privacy for details.

## Do not

- Don't invent APIs, env vars, or backend behavior — check `src/services/apis/` and `src/types/backend-types/` for the actual contracts.
- Don't bypass the role/permission system with ad-hoc checks.
- Don't add heavy dependencies to guest-facing routes without justification (bundle size directly hurts upload participation rates).
