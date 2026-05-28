# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

KT82 Race Suite — four mobile-first React web apps + an Express API for running the KT82 relay race. The KT82 is an ~82-mile multi-leg road relay race in rural Missouri. A typical team has 6 runners each running ~3 legs (~18 legs total). Leg count and lengths vary by year and are configured in the Manager app.

## Key Commands

```bash
# All pnpm commands require Node 20 in PATH:
# PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm ...

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

## Key Constraints

- Mobile-first; all touch targets ≥ 44px; legible in sunlight
- No GPS — all ETAs are pace-based only
- Poor connectivity tolerance — timestamps captured client-side, graceful offline messaging
- One active race at a time (MVP); data model supports multiple
