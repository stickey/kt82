# Sub-project 2 — Manager App

**Date:** 2026-05-28
**Scope:** Build the Race Manager Console (`apps/manager`) — the admin interface for creating a race, defining legs and handoffs, and managing teams. This is App 3 from the README.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Navigation | Top tabs (Race / Legs / Teams) | Compact, works on both desktop and mobile |
| Mobile nav | Tabs span full width with bottom border active indicator | Readable one-handed |
| Teams layout | Table on desktop, cards on mobile | 5-column table too cramped on small screens |
| Leg/handoff entry | One at a time via modal | Only ~18 legs; bulk entry not needed |
| Handoff inline | Expanded row shows name, address, lat, lng together | Handoff belongs to its leg; keeps context |
| PIN visibility | Permanently visible in teams list | Race director needs to look up PINs |
| Auth persistence | Password stored in localStorage; auto-sent with every request | Consistent with team PIN pattern; no sessions needed |
| Forms | Modal dialogs (full-width mobile, narrow centered desktop) | Works on both form factors |
| Export PINs | Print-friendly modal listing all team names + PINs | README requirement; simple to implement |

---

## Architecture

Single-page React app at `apps/manager`. Uses `@kt82/shared`'s `createApiClient` with the admin password from localStorage as the `X-Admin-Password` header on every request. All state is server-authoritative — no local caching beyond the password.

**File structure:**
```
apps/manager/src/
├── main.tsx
├── App.tsx                  # Tab router, auth gate
├── api.ts                   # createApiClient instance (reads password from localStorage)
├── components/
│   ├── LoginScreen.tsx      # Full-screen password prompt
│   ├── TabNav.tsx           # Top tab bar
│   ├── Modal.tsx            # Reusable modal wrapper
│   └── ConfirmDialog.tsx    # Reusable confirm (used for delete/reset)
├── tabs/
│   ├── RaceTab.tsx          # Race create/edit
│   ├── LegsTab.tsx          # Legs list + inline handoff expand
│   └── TeamsTab.tsx         # Teams table (desktop) / cards (mobile)
└── index.css                # Tailwind directives
```

---

## Auth Flow

1. On mount, `App.tsx` checks localStorage for `manager_password`.
2. If absent, renders `<LoginScreen />` — a centered card with a password input and "Sign in" button.
3. On submit: POST `/api/auth/admin` with `{ password }`. On 200, store in localStorage and proceed. On 401, show "Wrong password".
4. All API calls include `X-Admin-Password: <stored password>`. If any call returns 401 (password changed), clear localStorage and show `<LoginScreen />` again.
5. A "Sign out" link in the header clears localStorage and reloads.

---

## Race Tab

Fetches `GET /api/races` on mount. Since MVP supports one active race, displays the first result (or empty state).

**Empty state:** Card with "No race configured" and a "+ Create Race" button.

**Race present:** Card showing name and formatted date. "Edit" button opens a modal.

**Create/Edit modal fields:**
- Race name (text, required)
- Race date (date picker, required)

Submits to `POST /api/races` (create) or `PUT /api/races/:id` (edit). On success, refetches and closes modal.

---

## Legs Tab

Fetches `GET /api/races/:id/legs` on mount, where `:id` is the active race's id from the Race tab (stored in component state at the `App` level). Shows "Create a race first" if no race exists.

**Leg list:** Ordered by `legNumber`. Each row:
- Leg number, name, distance in miles
- Edit and Delete action links
- Expand/collapse toggle (clicking the row)
- If no handoff: amber "No handoff" badge

**Expanded row:** Shows handoff details inline below the leg info:
- Handoff name
- Address (if set)
- Lat/lng (if set)
- "Edit handoff" link → opens handoff modal

**"+ Add Leg" button** at top right.

**Add/Edit Leg modal fields:**
- Leg number (number, required)
- Name (text, required)
- Distance in miles (number, required)

**Add/Edit Handoff modal fields:**
- Handoff name (text, required)
- Address (text, optional)
- Latitude (number, optional)
- Longitude (number, optional)

Adding a handoff calls `POST /api/legs/:id/handoff`. Editing calls `PUT /api/handoffs/:id`.

**Delete leg:** Confirm dialog ("Delete Leg 3 — Rocheport? This cannot be undone.") → `DELETE /api/legs/:id`.

---

## Teams Tab

Fetches `GET /api/races/:id/teams` on mount. Requires an active race.

**Desktop layout (md+ breakpoint):** Table with columns:
- Team name + Rename / Reset action links
- PIN (monospace, always visible)
- Members count
- Legs assigned / total legs
- Status badge

**Mobile layout (below md):** Card per team showing:
- Team name + status badge
- PIN, member count, legs assigned in a row of small labels
- Rename and Reset action links

**Status badges:**
- `Locked` — green background, shown when `team.locked === true`
- `In progress` — amber text, shown when assignments exist but not locked
- `Not started` — gray, shown when no members or assignments

**"+ Add Team" button** opens a modal:
- Team name (text, required)
- PIN (text, required, 4–6 digits)

Submits to `POST /api/races/:id/teams`.

**Rename:** Inline modal, single text field for new name → `PUT /api/teams/:id`.

**Reset:** Confirm dialog ("Reset Team Alpha? This will delete all leg assignments and unlock the team.") → `POST /api/teams/:id/reset`.

**"Export PINs" button** opens a print-friendly modal listing all teams as:
```
Team Alpha    4821
Team Bravo    7743
Team Charlie  1192
```
With a "Print" button that calls `window.print()`.

---

## Responsive Behaviour

| Element | Mobile (< md) | Desktop (≥ md) |
|---|---|---|
| Tab bar | Full-width, equal columns, bottom border active | Compact inline tabs, right-aligned in header |
| Forms/modals | Full-width, bottom sheet feel | Narrow centered panel (max-width ~400px) |
| Teams | Cards | Table |
| Legs list | Same expand/collapse — tap targets ≥ 44px | Same |

---

## Error Handling

- Network errors: show inline error message near the triggering action ("Failed to save — check connection")
- 401 on any request: clear stored password, redirect to login
- 404/409 from API: show inline error with the server's `error` message
- No global error boundary needed for MVP

---

## Out of Scope

- Multi-race switching (one race at a time, MVP)
- Drag-and-drop leg reordering (edit leg number manually)
- Team member management (done in Captain app)
- Leg assignment management (done in Captain app)
- Map picker for handoff lat/lng (text input only)
