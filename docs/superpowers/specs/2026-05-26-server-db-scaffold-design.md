# Sub-project 1 — Server + DB + Monorepo Scaffold

**Date:** 2026-05-26
**Status:** Implemented
**Scope:** Foundational monorepo setup, Express API server, PostgreSQL schema via Prisma, shared package skeleton. All four frontend apps receive empty Vite+React shells. Sub-projects 2–5 fill in those shells.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo tooling | pnpm workspaces | Sufficient for 4 apps + 1 server; no Turborepo overhead |
| Frontend build tool | Vite + React + TypeScript | Standard for new React projects |
| Styling | Tailwind CSS | Already decided in README |
| Auth — team | PIN in `localStorage`, sent as `X-Team-Pin` header with every request | No JWT complexity; PIN uniquely identifies + authenticates the team |
| Auth — admin | Password sent as `X-Admin-Password` header; bcrypt hash stored in `.env` | Single password, no session needed |
| Auth — public | No header; Tracker routes are fully open | Tracker is read-only |
| Race start | Implicit: first `LegResult` row created when Driver/Timekeeper hits START | No explicit race-status field; status derived from data |
| PostgreSQL | Existing `relay-race-db` Docker container on `localhost:5432` | Already running; create new `kt82` database |
| Production serving | Express serves built app bundles as static files | Single deployment target (Railway) |
| MVP scope | One team (one race); data model supports multiple teams/races for the future | |

---

## Monorepo Structure

```
kt82/
├── package.json                 # pnpm workspaces root
├── pnpm-workspace.yaml
├── .gitignore                   # includes .superpowers/
├── apps/
│   ├── tracker/                 # App 1 — public read-only
│   ├── captain/                 # App 2 — PIN auth
│   ├── manager/                 # App 3 — admin auth
│   └── driver/                  # App 4 — PIN auth (Driver + Timekeeper)
├── packages/
│   └── shared/                  # Types, API client, ETA utility
└── server/
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts
    ├── src/
    │   ├── index.ts             # Express entry point, static file serving
    │   ├── middleware/
    │   │   ├── adminAuth.ts     # X-Admin-Password verification
    │   │   ├── teamAuth.ts      # X-Team-Pin → resolves req.team
    │   │   └── errorHandler.ts
    │   └── routes/
    │       ├── auth.ts
    │       ├── races.ts
    │       ├── legs.ts
    │       ├── handoffs.ts
    │       ├── teams.ts
    │       ├── members.ts
    │       ├── assignments.ts
    │       ├── results.ts
    │       └── tracker.ts
    ├── .env
    └── package.json
```

---

## Database Schema (Prisma)

```prisma
model Race {
  id        String   @id @default(cuid())
  name      String
  date      DateTime
  legs      Leg[]
  teams     Team[]
  createdAt DateTime @default(now())
}
// Admin password is global — stored as ADMIN_PASSWORD_HASH in server/.env
// Not per-race; all admin operations verify against the same hash.

model Leg {
  id            String          @id @default(cuid())
  raceId        String
  race          Race            @relation(fields: [raceId], references: [id])
  legNumber     Int
  name          String
  distanceMiles Float
  handoff       Handoff?
  assignments   LegAssignment[]
  results       LegResult[]
}

model Handoff {
  id      String  @id @default(cuid())
  legId   String  @unique
  leg     Leg     @relation(fields: [legId], references: [id])
  name    String
  address String?
  lat     Float?
  lng     Float?
}

model Team {
  id             String          @id @default(cuid())
  raceId         String
  race           Race            @relation(fields: [raceId], references: [id])
  name           String
  captainPinHash String
  locked         Boolean         @default(false)
  members        TeamMember[]
  assignments    LegAssignment[]
  results        LegResult[]
}

model TeamMember {
  id          String          @id @default(cuid())
  teamId      String
  team        Team            @relation(fields: [teamId], references: [id])
  name        String
  assignments LegAssignment[]
}

model LegAssignment {
  id                   String     @id @default(cuid())
  teamId               String
  team                 Team       @relation(fields: [teamId], references: [id])
  legId                String
  leg                  Leg        @relation(fields: [legId], references: [id])
  teamMemberId         String
  teamMember           TeamMember @relation(fields: [teamMemberId], references: [id])
  targetPaceSecPerMile Int

  @@unique([teamId, legId])
}

model LegResult {
  id         String    @id @default(cuid())
  teamId     String
  team       Team      @relation(fields: [teamId], references: [id])
  legId      String
  leg        Leg       @relation(fields: [legId], references: [id])
  startedAt  DateTime
  finishedAt DateTime?

  @@unique([teamId, legId])
}
```

---

## API Routes

### Auth (no auth required)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/admin` | `{ password }` | 200 or 401 |
| POST | `/api/auth/team` | `{ pin }` | `{ teamId }` or 401 |

### Race Setup — Manager (requires `X-Admin-Password`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/races` | List all races |
| POST | `/api/races` | Create race `{ name, date }` |
| GET | `/api/races/:id/legs` | List legs in order |
| POST | `/api/races/:id/legs` | Add leg `{ legNumber, name, distanceMiles }` |
| PUT | `/api/legs/:id` | Update leg |
| DELETE | `/api/legs/:id` | Delete leg |
| POST | `/api/legs/:id/handoff` | Set handoff `{ name, address?, lat?, lng? }` |
| PUT | `/api/handoffs/:id` | Update handoff |
| GET | `/api/races/:id/teams` | List teams with setup status |
| POST | `/api/races/:id/teams` | Create team `{ name, pin }` |
| PUT | `/api/teams/:id` | Update team name |
| POST | `/api/teams/:id/reset` | Unlock team, clear assignments |

### Team Setup — Captain (requires `X-Team-Pin`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/teams/:id` | Team detail with members + assignments |
| POST | `/api/teams/:id/members` | Add member `{ name }` |
| PUT | `/api/members/:id` | Rename member |
| DELETE | `/api/members/:id` | Remove member |
| POST | `/api/teams/:id/assignments` | Assign `{ legId, teamMemberId, targetPaceSecPerMile }` |
| PUT | `/api/assignments/:id` | Update pace or member |
| DELETE | `/api/assignments/:id` | Remove assignment |
| POST | `/api/teams/:id/lock` | Lock assignments (sets `locked = true`) |

### Race Day — Driver + Timekeeper (requires `X-Team-Pin`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/teams/:id/current` | Current leg, runner, ETA, next handoff |
| POST | `/api/teams/:id/results` | START — body: `{ legId, startedAt: clientTimestamp }` — create `LegResult` |
| PATCH | `/api/results/:id` | LAP: body `{ finishedAt: clientTimestamp, action: 'lap' }` — sets `finishedAt`, creates next `LegResult` where `startedAt = finishedAt`; STOP: `{ finishedAt, action: 'stop' }` — sets `finishedAt` only. All timestamps are client-provided. |

### Tracker (public, no auth)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/races/:id/status` | All teams: current leg, runner, ETA — polled every 30s |
| GET | `/api/teams/:id/timeline` | Full leg timeline with ETAs for one team |

---

## ETA Calculation

Implemented in `packages/shared/src/eta.ts`, used by both server (Tracker responses) and client (Driver + Timekeeper live display).

```ts
function calculateETA(
  assignment: LegAssignment,
  result: LegResult,
  leg: Leg,
  now: Date
): { eta: Date; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' }

// Logic:
// projectedTotal = assignment.targetPaceSecPerMile * leg.distanceMiles
// elapsed = (now - result.startedAt) / 1000
// remaining = projectedTotal - elapsed
// eta = now + remaining
// status: remaining > 60 → on-pace, remaining < -60 → overdue, else ahead
```

---

## Auth Middleware Detail

### `teamAuth.ts`
- Reads `X-Team-Pin` header
- Queries DB for team where `teamId` matches route param (`:id` or inferred from PIN lookup)
- `bcrypt.compare(pin, team.captainPinHash)` — returns 401 on mismatch
- Attaches `req.team` for downstream handlers
- Note: PIN lookup path — `POST /api/auth/team` returns the `teamId`; client stores both PIN and teamId in localStorage. All subsequent team requests use `teamId` in the URL + PIN in the header.

### `adminAuth.ts`
- Reads `X-Admin-Password` header
- `bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)` — returns 401 on mismatch
- `ADMIN_PASSWORD_HASH` is the only admin credential; not stored in the database

---

## `packages/shared` Exports

```ts
// types.ts — mirrors Prisma models (plain objects, no Prisma imports)
export type Race, Leg, Handoff, Team, TeamMember, LegAssignment, LegResult

// Composed response types
export type TeamDetail       // Team + members + assignments + results
export type TeamStatus       // For Tracker: current leg, runner, ETA
export type LegTimelineItem  // For Tracker detail: each leg with status + ETA

// api.ts — thin fetch wrapper
export function createApiClient(baseUrl: string, getHeaders: () => HeadersInit): ApiClient

// eta.ts
export function calculateETA(...): ETAResult
```

---

## Dev Environment

```bash
# .env (server/)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kt82"
ADMIN_PASSWORD_HASH=""   # populate with: node -e "console.log(require('bcrypt').hashSync('yourpw', 10))"
PORT=3001

# First-time setup
pnpm install
cd server && pnpm prisma migrate dev --name init
cd server && pnpm prisma db seed   # optional: seed a race skeleton

# Run server
pnpm --filter server dev    # nodemon, port 3001

# Run any frontend app
pnpm --filter tracker dev   # Vite, port 5173
pnpm --filter captain dev   # Vite, port 5174
pnpm --filter manager dev   # Vite, port 5175
pnpm --filter driver dev    # Vite, port 5176
```

---

## Production Build

Express serves each app's Vite build as static files under a path prefix:

```
GET /tracker/*  → apps/tracker/dist
GET /captain/*  → apps/captain/dist
GET /manager/*  → apps/manager/dist
GET /driver/*   → apps/driver/dist
GET /api/*      → Express routes
```

All apps configure `base: '/tracker'` etc. in their `vite.config.ts`.

---

## Out of Scope for This Sub-project

- Any UI implementation (all 4 app shells are empty)
- Seeding real KT82 leg/handoff data (entered via Manager app in Sub-project 2)
- Deployment configuration (Railway/Render Dockerfile)
- Tests (added per-sub-project as features are built)
