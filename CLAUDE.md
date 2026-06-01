# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

KT82 Race Suite — four mobile-first React web apps + an Express API for running the KT82 relay race. The KT82 is an ~82-mile multi-leg road relay race in rural Missouri. A typical team has 6 runners each running ~3 legs (~18 legs total). Leg count and lengths vary by year and are configured in the Manager app.

## Key Commands

```bash
# All pnpm commands require Node 20 in PATH:
# PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm ...

# Run the full dev stack (server + all 4 apps) — keep terminal open, Ctrl+C to stop
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
# For a specific git worktree: ./scripts/dev.sh <worktree-id>

# Run API server (port 3001, hot reload)
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev

# Run a frontend app
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker dev   # port 5173
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter captain dev   # port 5174
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter manager dev   # port 5175
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver dev    # port 5176

# Run server tests (must be in server/ dir)
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test

# Run a single test file
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/results.test.ts

# Seed all 18 legs + handoffs from resources/KT82legs.csv into a race
# 1. Create a race in the Manager app, copy its ID from the URL or DB
# 2. Run:
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm seed:legs <raceId> [csvFile]
# csvFile defaults to resources/KT82legs.csv if omitted; path relative to server/ or absolute
# Example: pnpm seed:legs clx123abc ../resources/KT82legs.csv
# Guards against double-seeding. To re-seed, wipe via Manager → Danger tab first.

# Seed a team roster from a CSV file (must have a "name" column)
# 1. Create a team in the Manager app, copy its ID from the DB
# 2. Run (csvFile path relative to server/ dir or absolute):
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm seed:roster <teamId> <csvFile>
# Example: pnpm seed:roster clx123abc ../resources/team.rungmc.csv
# Guards against double-seeding. Remove members first via the Captain app.

# Seed leg assignments from a CSV (must have legNumber, runner, targetPace columns)
# 1. Create a race, seed legs, create a team, seed roster
# 2. Run (csvFile path relative to server/ dir or absolute):
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm seed:assignments <teamId> <csvFile>
# Example: pnpm seed:assignments clx123abc ../resources/assignments.csv
# CSV format: legNumber,runner,targetPace  (targetPace as mm:ss, e.g. 8:30)
# Guards against double-seeding. Clear assignments via Manager → Teams → Reset first.

# Install dependencies after package.json changes (from repo root)
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm install

# Regenerate Prisma client (needed after pnpm install or schema changes)
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm exec prisma migrate dev
```

## Architecture

pnpm workspaces monorepo: `server/` (Express API), `packages/shared/` (types + ETA util + API client), `apps/{tracker,captain,manager,driver}/` (Vite+React+Tailwind).

In production, Express serves built app bundles as static files under path prefixes (`/tracker`, `/captain`, etc.). All four apps proxy `/api` to `http://localhost:3001` in dev.

## Server

- **Framework:** Express 4 + TypeScript 5, run with `tsx watch`
- **ORM:** Prisma 5 + PostgreSQL (`relay-race-db` Docker container, `kt82` database)
- **Tests:** Vitest 1 + Supertest — integration tests against `kt82_test` database; `fileParallelism: false` to prevent contamination
- **Test DB cleanup:** `beforeEach` deletes all rows in FK-safe order; `beforeAll` sets `ADMIN_PASSWORD_HASH` env
- **Auth:**
  - Admin routes: `X-Admin-Password` header → `adminAuth` middleware
  - Team routes where `:id` = teamId: `X-Team-Pin` header → `teamAuth` middleware
  - Team routes where param is a non-teamId (e.g. `/members/:id`): inline PIN verification from request body `teamId`
  - Tracker routes: public, no auth
- **Error handling:** `handlePrismaError` maps P2025→404, P2002/P2003→409

## Shared Package (`packages/shared`)

- `types.ts` — all domain interfaces (no Prisma imports)
- `eta.ts` — `calculateETA(assignment, result, leg, now)` → `{ eta, secondsRemaining, status }`
- `api.ts` — `createApiClient(baseUrl, getHeaders)` factory

## Race Format Details

- ~82 miles total, split into many legs (typically ~18 legs for a 6-person team)
- Each leg has a `legNumber`, `name`, and `distanceMiles`
- Each leg ends at a `Handoff` point (name, optional address/lat/lng for navigation)
- Race start is implicit: first `LegResult` created when Driver hits START
- All timestamps are client-provided (not server `new Date()`)

## Auth Credentials (dev)

- Admin password: `kt82admin`
- Team PINs: created via Manager app; `1234` used in tests
- DB: `postgresql://postgres:postgres@localhost:5432/kt82`

## Deployment (Production)

**Platform:** Render — single Docker web service. Tagged at `v1.1.0`.

**How it works:**
- `render.yaml` declares `runtime: docker`; Render builds the Dockerfile on every push to `main`
- The Dockerfile is a two-stage build (`node:20-slim`): builder installs all deps, builds SPAs + server, prunes dev deps; runtime copies only the artifacts
- `scripts/docker-start.sh` is the container entrypoint: runs `prisma migrate deploy` then `node server/dist/bundle.js`
- `scripts/esbuild-server.js` bundles `server/src/index.ts` + the `@kt82/shared` workspace package into a single CJS file so Node.js never needs to resolve the workspace TypeScript symlink at runtime

**Key files:**
- `Dockerfile` — multi-stage build definition
- `render.yaml` — Render Blueprint (runtime: docker, env var declarations)
- `scripts/docker-start.sh` — container startup (migrate + start)
- `scripts/esbuild-server.js` — esbuild bundler for production server

**Environment variables** (set in Render dashboard — `sync: false` in render.yaml):
- `DATABASE_URL` — PostgreSQL connection string (external DB, not Render-provisioned)
- `ADMIN_PASSWORD_HASH` — bcrypt hash of the admin password

**To deploy:** push to `main`. Render auto-deploys on every push.

**Why Docker, not Render's git-backed Node.js runtime:**
The git-backed runtime had irreconcilable build-environment differences: devDependency/dependency split at build time, `@types/node` discovery issues under `moduleResolution: NodeNext`, and Prisma binary target mismatches. Docker eliminates all of these — the environment is fully controlled by the Dockerfile. See `docs/deployment-notes.md` for full history.

**Why esbuild bundle instead of tsc output:**
`@kt82/shared` uses `"main": "src/index.ts"` (TypeScript source). Node.js can't load TypeScript at runtime. esbuild inlines shared code at build time so the container only needs to run plain JavaScript. Do not change `main` in `packages/shared/package.json` to a compiled path — it breaks Vite's Rollup bundler during SPA builds (CJS re-exports aren't statically analyzable by Rollup).

**Vercel was attempted and abandoned** — see `docs/deployment-notes.md` for details. Don't suggest Vercel as an alternative without reading that document first.

## Key Constraints

- Mobile-first; all touch targets ≥ 44px; legible in sunlight
- No GPS — all ETAs are pace-based only
- Poor connectivity tolerance — timestamps captured client-side, graceful offline messaging
- One active race at a time (MVP); data model supports multiple
