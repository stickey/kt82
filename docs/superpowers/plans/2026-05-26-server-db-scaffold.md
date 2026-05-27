# Server + DB + Monorepo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the KT82 monorepo with a working Express+Prisma API server, shared TypeScript package, and four empty Vite+React app shells.

**Architecture:** pnpm workspaces monorepo; `server/` (Express + Prisma + PostgreSQL) serves the REST API and in production also serves built static files from each `apps/*`; `packages/shared` exports domain types, an API client factory, and the ETA calculation utility consumed by both server and apps; app shells are empty at end of this sub-project.

**Tech Stack:** Node.js 20+, Express 4, Prisma 5, PostgreSQL (existing `relay-race-db` Docker container), bcrypt, TypeScript 5, tsx 4, Vitest 1, Supertest 6, Vite 5, React 18, Tailwind CSS 3, pnpm workspaces

---

## File Structure

**Root**
- `package.json` — workspace root, shared scripts
- `pnpm-workspace.yaml` — declares workspaces
- `.gitignore`

**packages/shared/**
- `package.json`
- `tsconfig.json`
- `src/index.ts` — re-exports everything
- `src/types.ts` — all domain types (no Prisma imports)
- `src/eta.ts` — `calculateETA` utility
- `src/api.ts` — `createApiClient` factory
- `src/__tests__/eta.test.ts`

**server/**
- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `.env`
- `prisma/schema.prisma`
- `src/index.ts` — calls `app.listen()`
- `src/app.ts` — Express app export (for tests)
- `src/lib/prisma.ts` — singleton PrismaClient
- `src/middleware/adminAuth.ts`
- `src/middleware/teamAuth.ts`
- `src/middleware/errorHandler.ts`
- `src/routes/auth.ts`
- `src/routes/races.ts`
- `src/routes/legs.ts`
- `src/routes/handoffs.ts`
- `src/routes/teams.ts`
- `src/routes/members.ts`
- `src/routes/assignments.ts`
- `src/routes/results.ts`
- `src/routes/tracker.ts`
- `src/__tests__/setup.ts` — beforeEach DB cleanup, beforeAll env setup
- `src/__tests__/helpers.ts` — factory functions for test data
- `src/__tests__/auth.test.ts`
- `src/__tests__/races.test.ts`
- `src/__tests__/legs.test.ts`
- `src/__tests__/handoffs.test.ts`
- `src/__tests__/teams.test.ts`
- `src/__tests__/members.test.ts`
- `src/__tests__/assignments.test.ts`
- `src/__tests__/results.test.ts`
- `src/__tests__/tracker.test.ts`

**apps/tracker/, apps/captain/, apps/manager/, apps/driver/**
- Standard Vite+React+TypeScript+Tailwind shell (generated + configured)

---

## Task 1: Initialize Monorepo Root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`

- [ ] **Step 1: Verify pnpm is available**

```bash
pnpm --version
```
Expected: `8.x` or `9.x`. If not installed: `npm install -g pnpm`

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "kt82",
  "private": true,
  "scripts": {
    "dev:server": "pnpm --filter server dev",
    "dev:tracker": "pnpm --filter tracker dev",
    "dev:captain": "pnpm --filter captain dev",
    "dev:manager": "pnpm --filter manager dev",
    "dev:driver": "pnpm --filter driver dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test"
  }
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'server'
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
.env.test
*.js.map
.superpowers/
```

- [ ] **Step 5: Initialize git and commit**

```bash
git init
git add package.json pnpm-workspace.yaml .gitignore
git commit -m "chore: initialize monorepo root"
```
Expected: 1 commit on main branch.

---

## Task 2: packages/shared — Types, ETA Utility, API Client

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/eta.ts`
- Create: `packages/shared/src/api.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/__tests__/eta.test.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@kt82/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/shared/src/types.ts**

```typescript
export interface Race {
  id: string
  name: string
  date: string
  createdAt: string
}

export interface Leg {
  id: string
  raceId: string
  legNumber: number
  name: string
  distanceMiles: number
  handoff?: Handoff
}

export interface Handoff {
  id: string
  legId: string
  name: string
  address?: string | null
  lat?: number | null
  lng?: number | null
}

export interface Team {
  id: string
  raceId: string
  name: string
  locked: boolean
}

export interface TeamMember {
  id: string
  teamId: string
  name: string
}

export interface LegAssignment {
  id: string
  teamId: string
  legId: string
  teamMemberId: string
  targetPaceSecPerMile: number
}

export interface LegResult {
  id: string
  teamId: string
  legId: string
  startedAt: string
  finishedAt: string | null
}

export interface TeamDetail extends Team {
  members: TeamMember[]
  assignments: (LegAssignment & { leg: Leg; teamMember: TeamMember })[]
  results: LegResult[]
}

export interface LegTimelineItem {
  leg: Leg
  assignment: (LegAssignment & { teamMember: TeamMember }) | null
  result: LegResult | null
  runner: TeamMember | null
  status: 'not-started' | 'in-progress' | 'completed'
  eta: ETAResult | null
}

export interface ETAResult {
  eta: Date
  secondsRemaining: number
  status: 'on-pace' | 'ahead' | 'overdue'
}
```

- [ ] **Step 4: Write the failing ETA test**

Create `packages/shared/src/__tests__/eta.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateETA } from '../eta'
import type { LegAssignment, LegResult, Leg } from '../types'

const leg: Leg = { id: 'leg1', raceId: 'race1', legNumber: 1, name: 'Leg 1', distanceMiles: 5 }
const assignment: LegAssignment = {
  id: 'a1', teamId: 't1', legId: 'leg1', teamMemberId: 'm1',
  targetPaceSecPerMile: 480 // 8:00/mile → 40 min for 5 miles = 2400s total
}

describe('calculateETA', () => {
  it('returns on-pace when more than 60s remaining', () => {
    const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 min ago
    const result: LegResult = { id: 'r1', teamId: 't1', legId: 'leg1', startedAt, finishedAt: null }
    const now = new Date()

    // elapsed=600s, projected=2400s, remaining=1800s
    const eta = calculateETA(assignment, result, leg, now)

    expect(eta.status).toBe('on-pace')
    expect(eta.secondsRemaining).toBeCloseTo(1800, 0)
    expect(eta.eta.getTime()).toBeCloseTo(now.getTime() + 1800 * 1000, -3)
  })

  it('returns overdue when more than 60s past projected finish', () => {
    const startedAt = new Date(Date.now() - 50 * 60 * 1000).toISOString() // 50 min ago
    const result: LegResult = { id: 'r1', teamId: 't1', legId: 'leg1', startedAt, finishedAt: null }
    const now = new Date()

    // elapsed=3000s, projected=2400s, remaining=-600s
    const eta = calculateETA(assignment, result, leg, now)

    expect(eta.status).toBe('overdue')
    expect(eta.secondsRemaining).toBeCloseTo(-600, 0)
  })

  it('returns ahead when within 60s of projected finish', () => {
    const startedAt = new Date(Date.now() - 39 * 60 * 1000).toISOString() // 39 min ago
    const result: LegResult = { id: 'r1', teamId: 't1', legId: 'leg1', startedAt, finishedAt: null }
    const now = new Date()

    // elapsed=2340s, projected=2400s, remaining=60s
    const eta = calculateETA(assignment, result, leg, now)

    expect(eta.status).toBe('ahead')
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

```bash
cd packages/shared && pnpm install && pnpm test
```
Expected: FAIL — `Cannot find module '../eta'`

- [ ] **Step 6: Implement calculateETA**

Create `packages/shared/src/eta.ts`:

```typescript
import type { LegAssignment, LegResult, Leg, ETAResult } from './types'

export function calculateETA(
  assignment: LegAssignment,
  result: LegResult,
  leg: Leg,
  now: Date = new Date()
): ETAResult {
  const projectedTotalSeconds = assignment.targetPaceSecPerMile * leg.distanceMiles
  const elapsedSeconds = (now.getTime() - new Date(result.startedAt).getTime()) / 1000
  const secondsRemaining = projectedTotalSeconds - elapsedSeconds
  const eta = new Date(now.getTime() + secondsRemaining * 1000)

  let status: ETAResult['status']
  if (secondsRemaining < -60) {
    status = 'overdue'
  } else if (secondsRemaining > 60) {
    status = 'on-pace'
  } else {
    status = 'ahead'
  }

  return { eta, secondsRemaining, status }
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd packages/shared && pnpm test
```
Expected: 3 tests PASS.

- [ ] **Step 8: Create packages/shared/src/api.ts**

```typescript
export interface ApiClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
}

export function createApiClient(
  baseUrl: string,
  getHeaders: () => HeadersInit
): ApiClient {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${method} ${path} → ${res.status}: ${text}`)
    }
    return res.json() as Promise<T>
  }
  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
  }
}
```

- [ ] **Step 9: Create packages/shared/src/index.ts**

```typescript
export * from './types'
export * from './eta'
export * from './api'
```

- [ ] **Step 10: Commit**

```bash
cd /path/to/kt82
git add packages/
git commit -m "feat: add shared types, ETA utility, and API client"
```

---

## Task 3: Server Initialization — Prisma Schema + Express Skeleton

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/prisma/schema.prisma`
- Create: `server/.env`
- Create: `server/src/lib/prisma.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "server",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@kt82/shared": "workspace:*",
    "@prisma/client": "^5.14.0",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "express": "^4.19.0"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.14.0",
    "supertest": "^7.0.0",
    "tsx": "^4.15.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create server/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Race {
  id        String   @id @default(cuid())
  name      String
  date      DateTime
  legs      Leg[]
  teams     Team[]
  createdAt DateTime @default(now())
}

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

- [ ] **Step 4: Create server/.env**

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kt82"
ADMIN_PASSWORD_HASH=""
PORT=3001
```

Generate the hash and fill it in:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_ADMIN_PASSWORD', 10).then(h => console.log(h))"
```
Copy the output and paste it as the value of `ADMIN_PASSWORD_HASH`.

- [ ] **Step 5: Install dependencies and run migration**

```bash
cd server && pnpm install
pnpm prisma migrate dev --name init
```
Expected: Migration applied, `kt82` database created, Prisma client generated.

- [ ] **Step 6: Create server/src/lib/prisma.ts**

```typescript
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

- [ ] **Step 7: Create server/src/app.ts** (minimal — routes added in later tasks)

```typescript
import express from 'express'
import cors from 'cors'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})
```

- [ ] **Step 8: Create server/src/index.ts**

```typescript
import { app } from './app'

const port = process.env.PORT ?? 3001
app.listen(Number(port), () => {
  console.log(`Server running on port ${port}`)
})
```

- [ ] **Step 9: Verify the server starts**

```bash
cd server && pnpm dev
```
Expected: `Server running on port 3001`. In a second terminal:
```bash
curl http://localhost:3001/api/health
```
Expected: `{"ok":true}`. Stop the server (Ctrl+C).

- [ ] **Step 10: Commit**

```bash
git add server/
git commit -m "feat: add server skeleton with Prisma schema and Express"
```

---

## Task 4: Test Infrastructure

**Files:**
- Create: `server/vitest.config.ts`
- Create: `server/src/__tests__/setup.ts`
- Create: `server/src/__tests__/helpers.ts`

- [ ] **Step 1: Create the test database**

```bash
docker exec relay-race-db psql -U postgres -c "CREATE DATABASE kt82_test;"
cd server && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kt82_test pnpm prisma migrate deploy
```
Expected: `kt82_test` database created with all tables.

- [ ] **Step 2: Create server/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/__tests__/setup.ts'],
    environment: 'node',
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/kt82_test',
    },
    pool: 'forks',
  },
})
```

- [ ] **Step 3: Create server/src/__tests__/setup.ts**

```typescript
import { beforeAll, beforeEach, afterAll } from 'vitest'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'

beforeAll(async () => {
  process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('testadmin', 1)
})

beforeEach(async () => {
  await prisma.legResult.deleteMany()
  await prisma.legAssignment.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.handoff.deleteMany()
  await prisma.leg.deleteMany()
  await prisma.race.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

- [ ] **Step 4: Create server/src/__tests__/helpers.ts**

```typescript
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'

export async function createRace(overrides: { name?: string; date?: Date } = {}) {
  return prisma.race.create({
    data: { name: 'KT82 Test Race', date: new Date('2026-06-01'), ...overrides },
  })
}

export async function createTeam(raceId: string, pin = '1234', name = 'Test Team') {
  return prisma.team.create({
    data: { raceId, name, captainPinHash: await bcrypt.hash(pin, 1) },
  })
}

export async function createLeg(
  raceId: string,
  legNumber: number,
  distanceMiles = 5.0
) {
  return prisma.leg.create({
    data: { raceId, legNumber, name: `Leg ${legNumber}`, distanceMiles },
  })
}

export async function createHandoff(legId: string) {
  return prisma.handoff.create({
    data: { legId, name: 'Test Handoff', lat: 38.5, lng: -92.5 },
  })
}

export async function createMember(teamId: string, name = 'Test Runner') {
  return prisma.teamMember.create({ data: { teamId, name } })
}

export async function createAssignment(
  teamId: string,
  legId: string,
  teamMemberId: string,
  targetPaceSecPerMile = 480
) {
  return prisma.legAssignment.create({
    data: { teamId, legId, teamMemberId, targetPaceSecPerMile },
  })
}
```

- [ ] **Step 5: Verify test infrastructure runs cleanly**

Create a smoke test `server/src/__tests__/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'

describe('health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
```

```bash
cd server && pnpm test
```
Expected: 1 test PASS.

- [ ] **Step 6: Commit**

```bash
git add server/vitest.config.ts server/src/__tests__/
git commit -m "test: add test infrastructure for server"
```

---

## Task 5: Auth Middleware + Auth Routes

**Files:**
- Create: `server/src/middleware/adminAuth.ts`
- Create: `server/src/middleware/teamAuth.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/app.ts`
- Create: `server/src/__tests__/auth.test.ts`

- [ ] **Step 1: Write failing auth tests**

Create `server/src/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createTeam } from './helpers'

describe('POST /api/auth/admin', () => {
  it('returns 200 with correct password', async () => {
    const res = await request(app)
      .post('/api/auth/admin')
      .send({ password: 'testadmin' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/admin')
      .send({ password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when password missing', async () => {
    const res = await request(app).post('/api/auth/admin').send({})
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/team', () => {
  it('returns 200 and teamId with correct PIN', async () => {
    const race = await createRace()
    const team = await createTeam(race.id, '5678')

    const res = await request(app)
      .post('/api/auth/team')
      .send({ pin: '5678' })
    expect(res.status).toBe(200)
    expect(res.body.teamId).toBe(team.id)
  })

  it('returns 401 with wrong PIN', async () => {
    const race = await createRace()
    await createTeam(race.id, '5678')

    const res = await request(app)
      .post('/api/auth/team')
      .send({ pin: '0000' })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && pnpm test src/__tests__/auth.test.ts
```
Expected: FAIL — routes not defined yet.

- [ ] **Step 3: Create server/src/middleware/adminAuth.ts**

```typescript
import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'

export async function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const password = req.headers['x-admin-password']
  if (!password || typeof password !== 'string') {
    res.status(401).json({ error: 'X-Admin-Password header required' })
    return
  }
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) {
    res.status(500).json({ error: 'Admin password not configured' })
    return
  }
  const valid = await bcrypt.compare(password, hash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid admin password' })
    return
  }
  next()
}
```

- [ ] **Step 4: Create server/src/middleware/teamAuth.ts**

```typescript
import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { Team } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      team?: Team
    }
  }
}

export async function teamAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const pin = req.headers['x-team-pin']
  const teamId = req.params.id ?? req.params.teamId
  if (!pin || typeof pin !== 'string') {
    res.status(401).json({ error: 'X-Team-Pin header required' })
    return
  }
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) {
    res.status(404).json({ error: 'Team not found' })
    return
  }
  const valid = await bcrypt.compare(pin, team.captainPinHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid PIN' })
    return
  }
  req.team = team
  next()
}
```

- [ ] **Step 5: Create server/src/middleware/errorHandler.ts**

```typescript
import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
}
```

- [ ] **Step 6: Create server/src/routes/auth.ts**

```typescript
import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'

const router = Router()

router.post('/auth/admin', async (req, res, next) => {
  try {
    const { password } = req.body
    if (!password) {
      return res.status(400).json({ error: 'password is required' })
    }
    const hash = process.env.ADMIN_PASSWORD_HASH
    if (!hash) return res.status(500).json({ error: 'Admin password not configured' })
    const valid = await bcrypt.compare(password, hash)
    if (!valid) return res.status(401).json({ error: 'Invalid password' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

router.post('/auth/team', async (req, res, next) => {
  try {
    const { pin } = req.body
    if (!pin) return res.status(400).json({ error: 'pin is required' })
    const teams = await prisma.team.findMany()
    for (const team of teams) {
      const valid = await bcrypt.compare(String(pin), team.captainPinHash)
      if (valid) return res.json({ teamId: team.id })
    }
    res.status(401).json({ error: 'Invalid PIN' })
  } catch (err) {
    next(err)
  }
})

export default router
```

- [ ] **Step 7: Update server/src/app.ts to include routes and error handler**

```typescript
import express from 'express'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './routes/auth'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', authRouter)

app.use(errorHandler)
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd server && pnpm test src/__tests__/auth.test.ts
```
Expected: 5 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add server/src/
git commit -m "feat: add auth middleware and auth routes"
```

---

## Task 6: Race, Leg, and Handoff Routes (Manager)

**Files:**
- Create: `server/src/routes/races.ts`
- Create: `server/src/routes/legs.ts`
- Create: `server/src/routes/handoffs.ts`
- Modify: `server/src/app.ts`
- Create: `server/src/__tests__/races.test.ts`
- Create: `server/src/__tests__/legs.test.ts`
- Create: `server/src/__tests__/handoffs.test.ts`

- [ ] **Step 1: Write failing tests for race routes**

Create `server/src/__tests__/races.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace } from './helpers'

const ADMIN = { 'X-Admin-Password': 'testadmin' }

describe('GET /api/races', () => {
  it('returns empty array when no races exist', async () => {
    const res = await request(app).get('/api/races').set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns 401 without admin password', async () => {
    const res = await request(app).get('/api/races')
    expect(res.status).toBe(401)
  })

  it('lists all races', async () => {
    await createRace({ name: 'KT82 2026' })
    const res = await request(app).get('/api/races').set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('KT82 2026')
  })
})

describe('POST /api/races', () => {
  it('creates a race', async () => {
    const res = await request(app)
      .post('/api/races')
      .set(ADMIN)
      .send({ name: 'KT82 2026', date: '2026-06-01' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('KT82 2026')
    expect(res.body.id).toBeTruthy()
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/races')
      .set(ADMIN)
      .send({ date: '2026-06-01' })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Write failing tests for leg routes**

Create `server/src/__tests__/legs.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createLeg } from './helpers'

const ADMIN = { 'X-Admin-Password': 'testadmin' }

describe('GET /api/races/:id/legs', () => {
  it('returns legs in legNumber order', async () => {
    const race = await createRace()
    await createLeg(race.id, 2)
    await createLeg(race.id, 1)

    const res = await request(app).get(`/api/races/${race.id}/legs`).set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body[0].legNumber).toBe(1)
    expect(res.body[1].legNumber).toBe(2)
  })
})

describe('POST /api/races/:id/legs', () => {
  it('creates a leg', async () => {
    const race = await createRace()
    const res = await request(app)
      .post(`/api/races/${race.id}/legs`)
      .set(ADMIN)
      .send({ legNumber: 1, name: 'Start to Barn', distanceMiles: 4.7 })
    expect(res.status).toBe(201)
    expect(res.body.distanceMiles).toBe(4.7)
  })
})

describe('PUT /api/legs/:id', () => {
  it('updates a leg', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)

    const res = await request(app)
      .put(`/api/legs/${leg.id}`)
      .set(ADMIN)
      .send({ distanceMiles: 5.2 })
    expect(res.status).toBe(200)
    expect(res.body.distanceMiles).toBe(5.2)
  })
})

describe('DELETE /api/legs/:id', () => {
  it('deletes a leg', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)

    const res = await request(app).delete(`/api/legs/${leg.id}`).set(ADMIN)
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 3: Write failing tests for handoff routes**

Create `server/src/__tests__/handoffs.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createLeg, createHandoff } from './helpers'

const ADMIN = { 'X-Admin-Password': 'testadmin' }

describe('POST /api/legs/:id/handoff', () => {
  it('creates a handoff for a leg', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)

    const res = await request(app)
      .post(`/api/legs/${leg.id}/handoff`)
      .set(ADMIN)
      .send({ name: 'Barn Parking Lot', lat: 38.512, lng: -92.431 })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Barn Parking Lot')
    expect(res.body.lat).toBe(38.512)
  })
})

describe('PUT /api/handoffs/:id', () => {
  it('updates a handoff', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)
    const handoff = await createHandoff(leg.id)

    const res = await request(app)
      .put(`/api/handoffs/${handoff.id}`)
      .set(ADMIN)
      .send({ address: '123 Rural Route, Booneville MO' })
    expect(res.status).toBe(200)
    expect(res.body.address).toBe('123 Rural Route, Booneville MO')
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd server && pnpm test src/__tests__/races.test.ts src/__tests__/legs.test.ts src/__tests__/handoffs.test.ts
```
Expected: FAIL — routes not registered.

- [ ] **Step 5: Create server/src/routes/races.ts**

```typescript
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { adminAuth } from '../middleware/adminAuth'

const router = Router()

router.get('/races', adminAuth, async (req, res, next) => {
  try {
    const races = await prisma.race.findMany({ orderBy: { date: 'asc' } })
    res.json(races.map(r => ({ ...r, date: r.date.toISOString(), createdAt: r.createdAt.toISOString() })))
  } catch (err) { next(err) }
})

router.post('/races', adminAuth, async (req, res, next) => {
  try {
    const { name, date } = req.body
    if (!name || !date) return res.status(400).json({ error: 'name and date are required' })
    const race = await prisma.race.create({ data: { name, date: new Date(date) } })
    res.status(201).json({ ...race, date: race.date.toISOString(), createdAt: race.createdAt.toISOString() })
  } catch (err) { next(err) }
})

export default router
```

- [ ] **Step 6: Create server/src/routes/legs.ts**

```typescript
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { adminAuth } from '../middleware/adminAuth'

const router = Router()

router.get('/races/:id/legs', adminAuth, async (req, res, next) => {
  try {
    const legs = await prisma.leg.findMany({
      where: { raceId: req.params.id },
      orderBy: { legNumber: 'asc' },
      include: { handoff: true },
    })
    res.json(legs)
  } catch (err) { next(err) }
})

router.post('/races/:id/legs', adminAuth, async (req, res, next) => {
  try {
    const { legNumber, name, distanceMiles } = req.body
    if (!legNumber || !name || !distanceMiles) {
      return res.status(400).json({ error: 'legNumber, name, and distanceMiles are required' })
    }
    const leg = await prisma.leg.create({
      data: { raceId: req.params.id, legNumber, name, distanceMiles },
    })
    res.status(201).json(leg)
  } catch (err) { next(err) }
})

router.put('/legs/:id', adminAuth, async (req, res, next) => {
  try {
    const { legNumber, name, distanceMiles } = req.body
    const leg = await prisma.leg.update({
      where: { id: req.params.id },
      data: { ...(legNumber && { legNumber }), ...(name && { name }), ...(distanceMiles && { distanceMiles }) },
    })
    res.json(leg)
  } catch (err) { next(err) }
})

router.delete('/legs/:id', adminAuth, async (req, res, next) => {
  try {
    await prisma.leg.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

export default router
```

- [ ] **Step 7: Create server/src/routes/handoffs.ts**

```typescript
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { adminAuth } from '../middleware/adminAuth'

const router = Router()

router.post('/legs/:id/handoff', adminAuth, async (req, res, next) => {
  try {
    const { name, address, lat, lng } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const handoff = await prisma.handoff.create({
      data: { legId: req.params.id, name, address, lat, lng },
    })
    res.status(201).json(handoff)
  } catch (err) { next(err) }
})

router.put('/handoffs/:id', adminAuth, async (req, res, next) => {
  try {
    const { name, address, lat, lng } = req.body
    const handoff = await prisma.handoff.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(address !== undefined && { address }), ...(lat !== undefined && { lat }), ...(lng !== undefined && { lng }) },
    })
    res.json(handoff)
  } catch (err) { next(err) }
})

export default router
```

- [ ] **Step 8: Update server/src/app.ts to register new routers**

```typescript
import express from 'express'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './routes/auth'
import racesRouter from './routes/races'
import legsRouter from './routes/legs'
import handoffsRouter from './routes/handoffs'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', authRouter)
app.use('/api', racesRouter)
app.use('/api', legsRouter)
app.use('/api', handoffsRouter)

app.use(errorHandler)
```

- [ ] **Step 9: Run tests to verify they pass**

```bash
cd server && pnpm test src/__tests__/races.test.ts src/__tests__/legs.test.ts src/__tests__/handoffs.test.ts
```
Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add server/src/
git commit -m "feat: add race, leg, and handoff routes"
```

---

## Task 7: Teams Routes (Manager)

**Files:**
- Create: `server/src/routes/teams.ts`
- Modify: `server/src/app.ts`
- Create: `server/src/__tests__/teams.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/__tests__/teams.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createTeam } from './helpers'

const ADMIN = { 'X-Admin-Password': 'testadmin' }

describe('GET /api/races/:id/teams', () => {
  it('lists teams with locked status', async () => {
    const race = await createRace()
    await createTeam(race.id, '1234', 'Fast Feet')

    const res = await request(app).get(`/api/races/${race.id}/teams`).set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Fast Feet')
    expect(res.body[0].locked).toBe(false)
  })
})

describe('POST /api/races/:id/teams', () => {
  it('creates a team and hashes the PIN', async () => {
    const race = await createRace()
    const res = await request(app)
      .post(`/api/races/${race.id}/teams`)
      .set(ADMIN)
      .send({ name: 'Speed Demons', pin: '9876' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Speed Demons')
    expect(res.body.captainPinHash).toBeUndefined()
    expect(res.body.pin).toBe('9876')
  })
})

describe('POST /api/teams/:id/reset', () => {
  it('unlocks the team and clears assignments', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    await prisma.team.update({ where: { id: team.id }, data: { locked: true } })

    const res = await request(app)
      .post(`/api/teams/${team.id}/reset`)
      .set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body.locked).toBe(false)
  })
})
```

Add `import { prisma } from '../lib/prisma'` at the top of the test file.

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && pnpm test src/__tests__/teams.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Create server/src/routes/teams.ts**

```typescript
import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { adminAuth } from '../middleware/adminAuth'
import { teamAuth } from '../middleware/teamAuth'

const router = Router()

// Manager: list teams
router.get('/races/:id/teams', adminAuth, async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      where: { raceId: req.params.id },
      select: { id: true, raceId: true, name: true, locked: true },
    })
    res.json(teams)
  } catch (err) { next(err) }
})

// Manager: create team
router.post('/races/:id/teams', adminAuth, async (req, res, next) => {
  try {
    const { name, pin } = req.body
    if (!name || !pin) return res.status(400).json({ error: 'name and pin are required' })
    const captainPinHash = await bcrypt.hash(String(pin), 10)
    const team = await prisma.team.create({
      data: { raceId: req.params.id, name, captainPinHash },
    })
    res.status(201).json({ id: team.id, raceId: team.raceId, name: team.name, locked: team.locked, pin })
  } catch (err) { next(err) }
})

// Manager: update team name
router.put('/teams/:id', adminAuth, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const team = await prisma.team.update({ where: { id: req.params.id }, data: { name } })
    res.json({ id: team.id, raceId: team.raceId, name: team.name, locked: team.locked })
  } catch (err) { next(err) }
})

// Manager: reset team
router.post('/teams/:id/reset', adminAuth, async (req, res, next) => {
  try {
    await prisma.legAssignment.deleteMany({ where: { teamId: req.params.id } })
    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: { locked: false },
    })
    res.json({ id: team.id, raceId: team.raceId, name: team.name, locked: team.locked })
  } catch (err) { next(err) }
})

// Captain: get team detail
router.get('/teams/:id', teamAuth, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: true,
        assignments: { include: { leg: { include: { handoff: true } }, teamMember: true } },
        results: true,
      },
    })
    if (!team) return res.status(404).json({ error: 'Team not found' })
    res.json({
      id: team.id, raceId: team.raceId, name: team.name, locked: team.locked,
      members: team.members,
      assignments: team.assignments,
      results: team.results.map(r => ({
        ...r, startedAt: r.startedAt.toISOString(), finishedAt: r.finishedAt?.toISOString() ?? null,
      })),
    })
  } catch (err) { next(err) }
})

// Captain: lock assignments
router.post('/teams/:id/lock', teamAuth, async (req, res, next) => {
  try {
    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: { locked: true },
    })
    res.json({ id: team.id, raceId: team.raceId, name: team.name, locked: team.locked })
  } catch (err) { next(err) }
})

export default router
```

- [ ] **Step 4: Update server/src/app.ts**

Add `import teamsRouter from './routes/teams'` and `app.use('/api', teamsRouter)` after handoffsRouter.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd server && pnpm test src/__tests__/teams.test.ts
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: add teams routes (manager + captain)"
```

---

## Task 8: Member + Assignment Routes (Captain)

**Files:**
- Create: `server/src/routes/members.ts`
- Create: `server/src/routes/assignments.ts`
- Modify: `server/src/app.ts`
- Create: `server/src/__tests__/members.test.ts`
- Create: `server/src/__tests__/assignments.test.ts`

- [ ] **Step 1: Write failing tests for member routes**

Create `server/src/__tests__/members.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createTeam, createMember } from './helpers'

describe('POST /api/teams/:id/members', () => {
  it('adds a team member', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)

    const res = await request(app)
      .post(`/api/teams/${team.id}/members`)
      .set('X-Team-Pin', '1234')
      .send({ name: 'Alice' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Alice')
    expect(res.body.teamId).toBe(team.id)
  })

  it('returns 401 without PIN', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const res = await request(app)
      .post(`/api/teams/${team.id}/members`)
      .send({ name: 'Alice' })
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/members/:id', () => {
  it('renames a member', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const member = await createMember(team.id, 'Alice')

    const res = await request(app)
      .put(`/api/members/${member.id}`)
      .set('X-Team-Pin', '1234')
      .send({ name: 'Alicia', teamId: team.id })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Alicia')
  })
})

describe('DELETE /api/members/:id', () => {
  it('removes a member', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const member = await createMember(team.id)

    const res = await request(app)
      .delete(`/api/members/${member.id}`)
      .set('X-Team-Pin', '1234')
      .send({ teamId: team.id })
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 2: Write failing tests for assignment routes**

Create `server/src/__tests__/assignments.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createTeam, createLeg, createMember, createAssignment } from './helpers'

describe('POST /api/teams/:id/assignments', () => {
  it('creates a leg assignment', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)

    const res = await request(app)
      .post(`/api/teams/${team.id}/assignments`)
      .set('X-Team-Pin', '1234')
      .send({ legId: leg.id, teamMemberId: member.id, targetPaceSecPerMile: 510 })
    expect(res.status).toBe(201)
    expect(res.body.targetPaceSecPerMile).toBe(510)
  })
})

describe('PUT /api/assignments/:id', () => {
  it('updates pace', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)
    const assignment = await createAssignment(team.id, leg.id, member.id, 480)

    const res = await request(app)
      .put(`/api/assignments/${assignment.id}`)
      .set('X-Team-Pin', '1234')
      .send({ targetPaceSecPerMile: 500, teamId: team.id })
    expect(res.status).toBe(200)
    expect(res.body.targetPaceSecPerMile).toBe(500)
  })
})

describe('DELETE /api/assignments/:id', () => {
  it('removes an assignment', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)
    const assignment = await createAssignment(team.id, leg.id, member.id)

    const res = await request(app)
      .delete(`/api/assignments/${assignment.id}`)
      .set('X-Team-Pin', '1234')
      .send({ teamId: team.id })
    expect(res.status).toBe(204)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd server && pnpm test src/__tests__/members.test.ts src/__tests__/assignments.test.ts
```
Expected: FAIL.

- [ ] **Step 4: Create server/src/routes/members.ts**

Note: PUT and DELETE for members need the teamId to run teamAuth (since the route param is memberId, not teamId). Pass `teamId` in the request body.

```typescript
import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { teamAuth } from '../middleware/teamAuth'

const router = Router()

router.post('/teams/:id/members', teamAuth, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const member = await prisma.teamMember.create({
      data: { teamId: req.params.id, name },
    })
    res.status(201).json(member)
  } catch (err) { next(err) }
})

// For PUT/DELETE, teamId comes from body so teamAuth can resolve the team
router.put('/members/:id', async (req, res, next) => {
  try {
    const { name, teamId } = req.body
    if (!name || !teamId) return res.status(400).json({ error: 'name and teamId are required' })
    const pin = req.headers['x-team-pin']
    if (!pin || typeof pin !== 'string') return res.status(401).json({ error: 'X-Team-Pin required' })
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) return res.status(404).json({ error: 'Team not found' })
    const valid = await bcrypt.compare(pin, team.captainPinHash)
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' })
    const member = await prisma.teamMember.update({ where: { id: req.params.id }, data: { name } })
    res.json(member)
  } catch (err) { next(err) }
})

router.delete('/members/:id', async (req, res, next) => {
  try {
    const { teamId } = req.body
    if (!teamId) return res.status(400).json({ error: 'teamId is required' })
    const pin = req.headers['x-team-pin']
    if (!pin || typeof pin !== 'string') return res.status(401).json({ error: 'X-Team-Pin required' })
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) return res.status(404).json({ error: 'Team not found' })
    const valid = await bcrypt.compare(pin as string, team.captainPinHash)
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' })
    await prisma.teamMember.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

export default router
```

- [ ] **Step 5: Create server/src/routes/assignments.ts**

Same teamId-from-body auth pattern for PUT and DELETE:

```typescript
import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { teamAuth } from '../middleware/teamAuth'

const router = Router()

router.post('/teams/:id/assignments', teamAuth, async (req, res, next) => {
  try {
    const { legId, teamMemberId, targetPaceSecPerMile } = req.body
    if (!legId || !teamMemberId || !targetPaceSecPerMile) {
      return res.status(400).json({ error: 'legId, teamMemberId, and targetPaceSecPerMile are required' })
    }
    const assignment = await prisma.legAssignment.create({
      data: { teamId: req.params.id, legId, teamMemberId, targetPaceSecPerMile },
    })
    res.status(201).json(assignment)
  } catch (err) { next(err) }
})

async function verifyTeamPin(teamId: string, pin: string): Promise<boolean> {
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) return false
  return bcrypt.compare(pin, team.captainPinHash)
}

router.put('/assignments/:id', async (req, res, next) => {
  try {
    const { teamId, targetPaceSecPerMile, teamMemberId } = req.body
    const pin = req.headers['x-team-pin']
    if (!teamId || !pin || typeof pin !== 'string') return res.status(400).json({ error: 'teamId and X-Team-Pin required' })
    if (!await verifyTeamPin(teamId, pin)) return res.status(401).json({ error: 'Invalid PIN' })
    const assignment = await prisma.legAssignment.update({
      where: { id: req.params.id },
      data: {
        ...(targetPaceSecPerMile && { targetPaceSecPerMile }),
        ...(teamMemberId && { teamMemberId }),
      },
    })
    res.json(assignment)
  } catch (err) { next(err) }
})

router.delete('/assignments/:id', async (req, res, next) => {
  try {
    const { teamId } = req.body
    const pin = req.headers['x-team-pin']
    if (!teamId || !pin || typeof pin !== 'string') return res.status(400).json({ error: 'teamId and X-Team-Pin required' })
    if (!await verifyTeamPin(teamId, pin)) return res.status(401).json({ error: 'Invalid PIN' })
    await prisma.legAssignment.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

export default router
```

- [ ] **Step 6: Update server/src/app.ts**

Add `import membersRouter from './routes/members'`, `import assignmentsRouter from './routes/assignments'`, and register both with `app.use('/api', ...)` after teamsRouter.

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd server && pnpm test src/__tests__/members.test.ts src/__tests__/assignments.test.ts
```
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/
git commit -m "feat: add member and assignment routes"
```

---

## Task 9: Results Routes (Driver + Timekeeper)

**Files:**
- Create: `server/src/routes/results.ts`
- Modify: `server/src/app.ts`
- Create: `server/src/__tests__/results.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/__tests__/results.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { prisma } from '../lib/prisma'
import { createRace, createTeam, createLeg, createMember, createAssignment } from './helpers'

describe('GET /api/teams/:id/current', () => {
  it('returns not-started when no results exist', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)

    const res = await request(app)
      .get(`/api/teams/${team.id}/current`)
      .set('X-Team-Pin', '1234')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('not-started')
    expect(res.body.nextLeg.legNumber).toBe(1)
  })

  it('returns in-progress with ETA when leg is active', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1, 5)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id, 480)
    const startedAt = new Date(Date.now() - 10 * 60 * 1000)
    await prisma.legResult.create({ data: { teamId: team.id, legId: leg.id, startedAt } })

    const res = await request(app)
      .get(`/api/teams/${team.id}/current`)
      .set('X-Team-Pin', '1234')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in-progress')
    expect(res.body.eta.status).toBe('on-pace')
    expect(res.body.currentRunner.name).toBe(member.name)
  })
})

describe('POST /api/teams/:id/results (START)', () => {
  it('creates a LegResult with client-provided startedAt', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)

    const startedAt = new Date().toISOString()
    const res = await request(app)
      .post(`/api/teams/${team.id}/results`)
      .set('X-Team-Pin', '1234')
      .send({ legId: leg.id, startedAt })
    expect(res.status).toBe(201)
    expect(res.body.legId).toBe(leg.id)
    expect(res.body.startedAt).toBe(startedAt)
    expect(res.body.finishedAt).toBeNull()
  })
})

describe('PATCH /api/results/:id (LAP)', () => {
  it('sets finishedAt and creates next LegResult with same timestamp', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg1 = await createLeg(race.id, 1, 5)
    const leg2 = await createLeg(race.id, 2, 5)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg1.id, member.id)
    await createAssignment(team.id, leg2.id, member.id)

    const startedAt = new Date(Date.now() - 40 * 60 * 1000)
    const result = await prisma.legResult.create({
      data: { teamId: team.id, legId: leg1.id, startedAt },
    })

    const finishedAt = new Date().toISOString()
    const res = await request(app)
      .patch(`/api/results/${result.id}`)
      .set('X-Team-Pin', '1234')
      .send({ finishedAt, action: 'lap' })
    expect(res.status).toBe(200)
    expect(res.body.current.finishedAt).toBe(finishedAt)
    expect(res.body.next.legId).toBe(leg2.id)
    expect(res.body.next.startedAt).toBe(finishedAt)
  })
})

describe('PATCH /api/results/:id (STOP)', () => {
  it('sets finishedAt and returns null for next', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1, 5)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)

    const result = await prisma.legResult.create({
      data: { teamId: team.id, legId: leg.id, startedAt: new Date(Date.now() - 20 * 60 * 1000) },
    })

    const finishedAt = new Date().toISOString()
    const res = await request(app)
      .patch(`/api/results/${result.id}`)
      .set('X-Team-Pin', '1234')
      .send({ finishedAt, action: 'stop' })
    expect(res.status).toBe(200)
    expect(res.body.current.finishedAt).toBe(finishedAt)
    expect(res.body.next).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && pnpm test src/__tests__/results.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Create server/src/routes/results.ts**

```typescript
import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { teamAuth } from '../middleware/teamAuth'
import { calculateETA } from '@kt82/shared'

const router = Router()

function serializeResult(r: { id: string; teamId: string; legId: string; startedAt: Date; finishedAt: Date | null }) {
  return { ...r, startedAt: r.startedAt.toISOString(), finishedAt: r.finishedAt?.toISOString() ?? null }
}

router.get('/teams/:id/current', teamAuth, async (req, res, next) => {
  try {
    const teamId = req.params.id
    const activeResult = await prisma.legResult.findFirst({
      where: { teamId, finishedAt: null },
      include: { leg: { include: { handoff: true } } },
    })

    if (!activeResult) {
      const firstAssignment = await prisma.legAssignment.findFirst({
        where: { teamId },
        orderBy: { leg: { legNumber: 'asc' } },
        include: { leg: true, teamMember: true },
      })
      return res.json({
        status: 'not-started',
        nextLeg: firstAssignment?.leg ?? null,
        nextRunner: firstAssignment?.teamMember ?? null,
      })
    }

    const assignment = await prisma.legAssignment.findFirst({
      where: { teamId, legId: activeResult.legId },
      include: { teamMember: true },
    })

    const eta = assignment
      ? calculateETA(
          { id: assignment.id, teamId, legId: assignment.legId, teamMemberId: assignment.teamMemberId, targetPaceSecPerMile: assignment.targetPaceSecPerMile },
          { id: activeResult.id, teamId, legId: activeResult.legId, startedAt: activeResult.startedAt.toISOString(), finishedAt: null },
          { id: activeResult.leg.id, raceId: activeResult.leg.raceId, legNumber: activeResult.leg.legNumber, name: activeResult.leg.name, distanceMiles: activeResult.leg.distanceMiles },
          new Date()
        )
      : null

    res.json({
      status: 'in-progress',
      result: serializeResult(activeResult),
      currentLeg: activeResult.leg,
      nextHandoff: activeResult.leg.handoff,
      currentRunner: assignment?.teamMember ?? null,
      assignment,
      eta,
    })
  } catch (err) { next(err) }
})

router.post('/teams/:id/results', teamAuth, async (req, res, next) => {
  try {
    const { legId, startedAt } = req.body
    if (!legId || !startedAt) return res.status(400).json({ error: 'legId and startedAt are required' })
    const result = await prisma.legResult.create({
      data: { teamId: req.params.id, legId, startedAt: new Date(startedAt) },
    })
    res.status(201).json(serializeResult(result))
  } catch (err) { next(err) }
})

router.patch('/results/:id', async (req, res, next) => {
  try {
    const { finishedAt, action } = req.body
    if (!finishedAt || !action) return res.status(400).json({ error: 'finishedAt and action are required' })

    const existing = await prisma.legResult.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Result not found' })

    const pin = req.headers['x-team-pin']
    if (!pin || typeof pin !== 'string') return res.status(401).json({ error: 'X-Team-Pin required' })
    const team = await prisma.team.findUnique({ where: { id: existing.teamId } })
    if (!team) return res.status(404).json({ error: 'Team not found' })
    const valid = await bcrypt.compare(pin, team.captainPinHash)
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' })

    const updated = await prisma.legResult.update({
      where: { id: req.params.id },
      data: { finishedAt: new Date(finishedAt) },
    })

    if (action === 'stop') {
      return res.json({ current: serializeResult(updated), next: null })
    }

    const currentLeg = await prisma.leg.findUnique({ where: { id: existing.legId } })
    const nextAssignment = await prisma.legAssignment.findFirst({
      where: { teamId: existing.teamId, leg: { legNumber: { gt: currentLeg!.legNumber } } },
      orderBy: { leg: { legNumber: 'asc' } },
    })

    if (!nextAssignment) {
      return res.json({ current: serializeResult(updated), next: null })
    }

    const nextResult = await prisma.legResult.create({
      data: { teamId: existing.teamId, legId: nextAssignment.legId, startedAt: new Date(finishedAt) },
    })

    res.json({ current: serializeResult(updated), next: serializeResult(nextResult) })
  } catch (err) { next(err) }
})

export default router
```

- [ ] **Step 4: Update server/src/app.ts**

Add `import resultsRouter from './routes/results'` and `app.use('/api', resultsRouter)`.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd server && pnpm test src/__tests__/results.test.ts
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: add results routes (driver + timekeeper)"
```

---

## Task 10: Tracker Routes (Public)

**Files:**
- Create: `server/src/routes/tracker.ts`
- Modify: `server/src/app.ts`
- Create: `server/src/__tests__/tracker.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/__tests__/tracker.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { prisma } from '../lib/prisma'
import { createRace, createTeam, createLeg, createMember, createAssignment } from './helpers'

describe('GET /api/races/:id/status (no auth)', () => {
  it('returns all teams with not-started status before race begins', async () => {
    const race = await createRace()
    await createTeam(race.id, '1234', 'Team A')
    await createTeam(race.id, '5678', 'Team B')

    const res = await request(app).get(`/api/races/${race.id}/status`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].status).toBe('not-started')
  })

  it('returns current runner and ETA for an in-progress team', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1, 5)
    const member = await createMember(team.id, 'Bob')
    await createAssignment(team.id, leg.id, member.id, 480)
    await prisma.legResult.create({
      data: { teamId: team.id, legId: leg.id, startedAt: new Date(Date.now() - 10 * 60 * 1000) },
    })

    const res = await request(app).get(`/api/races/${race.id}/status`)
    expect(res.status).toBe(200)
    expect(res.body[0].status).toBe('in-progress')
    expect(res.body[0].currentRunner.name).toBe('Bob')
    expect(res.body[0].eta).toBeTruthy()
  })
})

describe('GET /api/teams/:id/timeline (no auth)', () => {
  it('returns all legs with assignment, runner, and status', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg1 = await createLeg(race.id, 1, 5)
    const leg2 = await createLeg(race.id, 2, 5)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg1.id, member.id, 480)
    await createAssignment(team.id, leg2.id, member.id, 480)

    const finishedAt = new Date()
    const startedAt = new Date(finishedAt.getTime() - 41 * 60 * 1000)
    await prisma.legResult.create({ data: { teamId: team.id, legId: leg1.id, startedAt, finishedAt } })

    const res = await request(app).get(`/api/teams/${team.id}/timeline`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].status).toBe('completed')
    expect(res.body[1].status).toBe('not-started')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && pnpm test src/__tests__/tracker.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Create server/src/routes/tracker.ts**

```typescript
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { calculateETA } from '@kt82/shared'

const router = Router()

router.get('/races/:id/status', async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({ where: { raceId: req.params.id } })
    const now = new Date()

    const statuses = await Promise.all(
      teams.map(async (team) => {
        const activeResult = await prisma.legResult.findFirst({
          where: { teamId: team.id, finishedAt: null },
          include: { leg: { include: { handoff: true } } },
        })

        if (!activeResult) {
          return { team: { id: team.id, name: team.name }, status: 'not-started', currentRunner: null, eta: null }
        }

        const assignment = await prisma.legAssignment.findFirst({
          where: { teamId: team.id, legId: activeResult.legId },
          include: { teamMember: true },
        })

        const eta = assignment
          ? calculateETA(
              { id: assignment.id, teamId: team.id, legId: assignment.legId, teamMemberId: assignment.teamMemberId, targetPaceSecPerMile: assignment.targetPaceSecPerMile },
              { id: activeResult.id, teamId: team.id, legId: activeResult.legId, startedAt: activeResult.startedAt.toISOString(), finishedAt: null },
              { id: activeResult.leg.id, raceId: activeResult.leg.raceId, legNumber: activeResult.leg.legNumber, name: activeResult.leg.name, distanceMiles: activeResult.leg.distanceMiles },
              now
            )
          : null

        return {
          team: { id: team.id, name: team.name },
          status: 'in-progress',
          currentLeg: { id: activeResult.leg.id, legNumber: activeResult.leg.legNumber, name: activeResult.leg.name, distanceMiles: activeResult.leg.distanceMiles },
          currentRunner: assignment?.teamMember ?? null,
          nextHandoff: activeResult.leg.handoff,
          eta,
        }
      })
    )

    res.json(statuses)
  } catch (err) { next(err) }
})

router.get('/teams/:id/timeline', async (req, res, next) => {
  try {
    const teamId = req.params.id
    const assignments = await prisma.legAssignment.findMany({
      where: { teamId },
      orderBy: { leg: { legNumber: 'asc' } },
      include: { leg: { include: { handoff: true } }, teamMember: true },
    })

    const results = await prisma.legResult.findMany({ where: { teamId } })
    const resultByLeg = Object.fromEntries(results.map((r) => [r.legId, r]))
    const now = new Date()

    const timeline = assignments.map((assignment) => {
      const result = resultByLeg[assignment.legId]

      if (!result) {
        return { leg: assignment.leg, assignment, runner: assignment.teamMember, status: 'not-started', result: null, eta: null }
      }

      if (result.finishedAt) {
        return {
          leg: assignment.leg, assignment, runner: assignment.teamMember, status: 'completed',
          result: { ...result, startedAt: result.startedAt.toISOString(), finishedAt: result.finishedAt.toISOString() },
          eta: null,
        }
      }

      const eta = calculateETA(
        { id: assignment.id, teamId, legId: assignment.legId, teamMemberId: assignment.teamMemberId, targetPaceSecPerMile: assignment.targetPaceSecPerMile },
        { id: result.id, teamId, legId: result.legId, startedAt: result.startedAt.toISOString(), finishedAt: null },
        { id: assignment.leg.id, raceId: assignment.leg.raceId, legNumber: assignment.leg.legNumber, name: assignment.leg.name, distanceMiles: assignment.leg.distanceMiles },
        now
      )

      return {
        leg: assignment.leg, assignment, runner: assignment.teamMember, status: 'in-progress',
        result: { ...result, startedAt: result.startedAt.toISOString(), finishedAt: null },
        eta,
      }
    })

    res.json(timeline)
  } catch (err) { next(err) }
})

export default router
```

- [ ] **Step 4: Update server/src/app.ts**

Add `import trackerRouter from './routes/tracker'` and `app.use('/api', trackerRouter)`. Remove the smoke test file (`src/__tests__/smoke.test.ts`) created in Task 4 — it's superseded.

Final `server/src/app.ts`:

```typescript
import express from 'express'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './routes/auth'
import racesRouter from './routes/races'
import legsRouter from './routes/legs'
import handoffsRouter from './routes/handoffs'
import teamsRouter from './routes/teams'
import membersRouter from './routes/members'
import assignmentsRouter from './routes/assignments'
import resultsRouter from './routes/results'
import trackerRouter from './routes/tracker'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api', authRouter)
app.use('/api', racesRouter)
app.use('/api', legsRouter)
app.use('/api', handoffsRouter)
app.use('/api', teamsRouter)
app.use('/api', membersRouter)
app.use('/api', assignmentsRouter)
app.use('/api', resultsRouter)
app.use('/api', trackerRouter)

app.use(errorHandler)
```

- [ ] **Step 5: Run full test suite**

```bash
cd server && pnpm test
```
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: add tracker routes (public)"
```

---

## Task 11: Static File Serving (Production Mode)

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: Add static file serving to app.ts**

Insert after the `app.use(express.json())` line and before any route registrations:

```typescript
import path from 'path'

// In production, serve each app's built assets
if (process.env.NODE_ENV === 'production') {
  const appsDir = path.resolve(__dirname, '../../apps')
  const apps = ['tracker', 'captain', 'manager', 'driver']
  for (const appName of apps) {
    const distPath = path.join(appsDir, appName, 'dist')
    app.use(`/${appName}`, express.static(distPath))
    app.get(`/${appName}/*`, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }
}
```

Add `import path from 'path'` at the top of the file.

- [ ] **Step 2: Run tests to verify nothing broke**

```bash
cd server && pnpm test
```
Expected: all tests PASS (static serving only activates in production).

- [ ] **Step 3: Commit**

```bash
git add server/src/app.ts
git commit -m "feat: serve frontend app builds as static files in production"
```

---

## Task 12: Scaffold Four Vite+React App Shells

**Files:** All files in `apps/tracker/`, `apps/captain/`, `apps/manager/`, `apps/driver/`

- [ ] **Step 1: Scaffold apps with Vite**

```bash
cd apps
pnpm create vite tracker --template react-ts
pnpm create vite captain --template react-ts
pnpm create vite manager --template react-ts
pnpm create vite driver --template react-ts
```

- [ ] **Step 2: Add Tailwind to each app**

Run this for `tracker`, `captain`, `manager`, and `driver` (replace `APP` each time):

```bash
cd apps/APP
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p
```

Update `tailwind.config.js` in each app:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `src/index.css` in each app (replace existing content):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Add @kt82/shared dependency to each app**

In each app's `package.json`, add to `dependencies`:
```json
"@kt82/shared": "workspace:*"
```

- [ ] **Step 4: Configure base path and API proxy in each app's vite.config.ts**

`apps/tracker/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tracker',
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
})
```

`apps/captain/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/captain',
  server: { port: 5174, proxy: { '/api': 'http://localhost:3001' } },
})
```

`apps/manager/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/manager',
  server: { port: 5175, proxy: { '/api': 'http://localhost:3001' } },
})
```

`apps/driver/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/driver',
  server: { port: 5176, proxy: { '/api': 'http://localhost:3001' } },
})
```

- [ ] **Step 5: Replace App.tsx in each app with a minimal placeholder**

Use this content for all four (change the title per app):

`apps/tracker/src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <h1 className="text-2xl font-bold">KT82 Tracker</h1>
    </div>
  )
}
```

`apps/captain/src/App.tsx` — same but `KT82 Captain`
`apps/manager/src/App.tsx` — same but `KT82 Manager`
`apps/driver/src/App.tsx` — same but `KT82 Driver + Timekeeper`

- [ ] **Step 6: Install all dependencies from monorepo root**

```bash
cd /path/to/kt82 && pnpm install
```

- [ ] **Step 7: Verify each app dev server starts**

```bash
pnpm --filter tracker dev
```
Open `http://localhost:5173/tracker` — expect to see "KT82 Tracker" on a dark background. Ctrl+C.

Repeat for captain (`http://localhost:5174/captain`), manager (`http://localhost:5175/manager`), driver (`http://localhost:5176/driver`).

- [ ] **Step 8: Run full test suite one final time**

```bash
pnpm --filter server test
pnpm --filter @kt82/shared test
```
Expected: all tests PASS.

- [ ] **Step 9: Final commit**

```bash
git add apps/ packages/ server/ pnpm-workspace.yaml package.json .gitignore
git commit -m "feat: scaffold four Vite+React app shells with Tailwind"
```
