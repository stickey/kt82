# Next Runner Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an "On Deck" chip in the Driver app's timing screen with the next runner's name, upcoming leg number, and their projected finish time.

**Architecture:** The server's `GET /teams/:id/current` already returns `currentRunner`. We extend it to also return `nextRunner`, `nextLeg`, and `nextRunnerEta` (computed as `currentRunnerETA + nextPace × nextDistance`). These fields flow through the driver app's view state into `TimingScreen`, which renders the chip. No new routes or components needed.

**Tech Stack:** Express/Prisma (server), TypeScript + React (driver app)

---

### Task 1: Extend the server response with next-runner fields

**Files:**
- Modify: `server/src/routes/results.ts`
- Test: `server/src/__tests__/results.test.ts`

- [ ] **Step 1: Write failing tests**

Open `server/src/__tests__/results.test.ts`. Add these two tests inside the existing `describe('GET /api/teams/:id/current', ...)` block, after the last existing `it(...)`:

```ts
it('returns nextRunner and nextLeg when a second leg assignment exists', async () => {
  const race = await createRace()
  const team = await createTeam(race.id)
  const leg1 = await createLeg(race.id, 1, 5)
  const leg2 = await createLeg(race.id, 2, 4)
  const runner1 = await createMember(team.id, 'Alice')
  const runner2 = await createMember(team.id, 'Bob')
  await createAssignment(team.id, leg1.id, runner1.id, 480)
  await createAssignment(team.id, leg2.id, runner2.id, 500)
  const startedAt = new Date(Date.now() - 5 * 60 * 1000)
  await prisma.legResult.create({ data: { teamId: team.id, legId: leg1.id, startedAt } })

  const res = await request(app)
    .get(`/api/teams/${team.id}/current`)
    .set('X-Team-Pin', '1234')
  expect(res.status).toBe(200)
  expect(res.body.nextRunner.name).toBe('Bob')
  expect(res.body.nextLeg.legNumber).toBe(2)
  expect(res.body.nextRunnerEta).not.toBeNull()
  // nextRunnerEta should be a valid ISO string in the future
  expect(new Date(res.body.nextRunnerEta).getTime()).toBeGreaterThan(Date.now())
})

it('returns null nextRunner on the last leg', async () => {
  const race = await createRace()
  const team = await createTeam(race.id)
  const leg1 = await createLeg(race.id, 1, 5)
  const runner1 = await createMember(team.id, 'Alice')
  await createAssignment(team.id, leg1.id, runner1.id, 480)
  await prisma.legResult.create({ data: { teamId: team.id, legId: leg1.id, startedAt: new Date() } })

  const res = await request(app)
    .get(`/api/teams/${team.id}/current`)
    .set('X-Team-Pin', '1234')
  expect(res.status).toBe(200)
  expect(res.body.nextRunner).toBeNull()
  expect(res.body.nextLeg).toBeNull()
  expect(res.body.nextRunnerEta).toBeNull()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/results.test.ts
```

Expected: the two new tests fail with "Cannot read properties of null (reading 'name')" or similar — `nextRunner` is undefined in the response.

- [ ] **Step 3: Update the server route**

In `server/src/routes/results.ts`, find the `GET /teams/:id/current` handler. After the block that computes `assignment` and `eta` (around line 35–65), add:

```ts
const nextAssignment = await prisma.legAssignment.findFirst({
  where: {
    teamId,
    leg: { legNumber: { gt: activeResult.leg.legNumber } },
  },
  orderBy: { leg: { legNumber: 'asc' } },
  include: { teamMember: true, leg: true },
})

const nextRunnerEta = (eta && nextAssignment)
  ? new Date(
      eta.eta.getTime() +
      nextAssignment.targetPaceSecPerMile * nextAssignment.leg.distanceMiles * 1000
    ).toISOString()
  : null
```

Then add three fields to the `res.json(...)` call:
```ts
res.json({
  status: 'in-progress',
  result: serializeResult(activeResult),
  currentLeg: activeResult.leg,
  nextHandoff: activeResult.leg.handoff,
  currentRunner: assignment?.teamMember ?? null,
  assignment,
  eta,
  raceStartedAt: (firstResult ?? activeResult).startedAt.toISOString(),
  nextRunner: nextAssignment?.teamMember ?? null,   // add
  nextLeg: nextAssignment?.leg ?? null,             // add
  nextRunnerEta,                                    // add
})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/results.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/results.ts server/src/__tests__/results.test.ts
git commit -m "feat(api): return nextRunner, nextLeg, nextRunnerEta from GET /teams/:id/current"
```

---

### Task 2: Update driver app types and state

**Files:**
- Modify: `apps/driver/src/api.ts`
- Modify: `apps/driver/src/App.tsx`

- [ ] **Step 1: Add fields to CurrentStateInProgress type**

In `apps/driver/src/api.ts`, find the `CurrentStateInProgress` type and add three fields:

```ts
export type CurrentStateInProgress = {
  status: 'in-progress'
  result: { id: string; teamId: string; legId: string; startedAt: string; finishedAt: null }
  currentLeg: Leg
  nextHandoff: Handoff | null
  currentRunner: TeamMember | null
  eta: { eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
  raceStartedAt: string | null
  nextRunner: TeamMember | null      // add
  nextLeg: Leg | null                // add
  nextRunnerEta: string | null       // add
}
```

- [ ] **Step 2: Update the racing view variant in App.tsx**

In `apps/driver/src/App.tsx`, find the `View` type definition and add fields to the `racing` variant:

```ts
| { type: 'racing'; race: Race; team: TeamSummary; pin: string; resultId: string; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLegNumber: number | null; nextRunnerEta: string | null }
```

- [ ] **Step 3: Populate the new fields in all three transitions**

In `App.tsx`, find the three places that set `{ type: 'racing', ... }` — in `handleAuth`, `handleStart`, and `handleLap`. Add to each:

```ts
nextRunner: state.nextRunner?.name ?? null,
nextLegNumber: state.nextLeg?.legNumber ?? null,
nextRunnerEta: state.nextRunnerEta ?? null,
```

- [ ] **Step 4: Pass new props to TimingScreen**

In `App.tsx`, find where `<TimingScreen .../>` is rendered and add:

```tsx
nextRunner={view.nextRunner}
nextLegNumber={view.nextLegNumber}
nextRunnerEta={view.nextRunnerEta}
```

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/api.ts apps/driver/src/App.tsx
git commit -m "feat(driver): thread nextRunner/nextLeg/nextRunnerEta through app state"
```

---

### Task 3: Render the On Deck chip in TimingScreen

**Files:**
- Modify: `apps/driver/src/components/TimingScreen.tsx`

- [ ] **Step 1: Add props to TimingScreen**

In `apps/driver/src/components/TimingScreen.tsx`, find the `Props` interface and add:

```ts
interface Props {
  team: TeamSummary
  pin: string
  resultId: string
  leg: Leg
  startedAt: string
  nextHandoff: Handoff | null
  currentRunner: string | null
  raceStartedAt: string | null
  onLap: (state: CurrentStateInProgress) => void
  onComplete: () => void
  nextRunner: string | null       // add
  nextLegNumber: number | null    // add
  nextRunnerEta: string | null    // add
}
```

Update the function signature to destructure the new props:
```ts
export function TimingScreen({ team, pin, resultId, leg, startedAt, nextHandoff, currentRunner, raceStartedAt, onLap, onComplete, nextRunner, nextLegNumber, nextRunnerEta }: Props) {
```

- [ ] **Step 2: Insert the On Deck chip**

In `TimingScreen.tsx`, find the section that displays `currentRunner`. It looks like:
```tsx
{currentRunner && (
  <div ...>
    ...{currentRunner}...
  </div>
)}
```

Immediately after that block (before the `<hr>` or divider line), insert:

```tsx
{nextRunner && (
  <div className="bg-slate-800 rounded-lg px-3 py-2.5 mt-2">
    <div className="flex justify-between items-start">
      <div>
        <div className="text-xs uppercase tracking-widest text-amber-400 mb-0.5">On Deck</div>
        <div className="text-sm font-semibold text-white">{nextRunner}</div>
        {nextRunnerEta && (
          <div className="text-xs text-slate-400 mt-0.5">Est. finish {formatTime(nextRunnerEta)}</div>
        )}
      </div>
      {nextLegNumber && (
        <div className="text-xs text-slate-400">Leg {nextLegNumber}</div>
      )}
    </div>
  </div>
)}
```

`formatTime` is already imported in this file from `../api`.

- [ ] **Step 3: Verify in browser**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver dev
```

Log in with a team that has at least 2 leg assignments. Start leg 1. Confirm the amber "On Deck" chip appears showing the next runner's name, "Leg N", and "Est. finish H:MM AM/PM". Tap LAP — chip should update to the third runner (or disappear if leg 2 was the last).

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/components/TimingScreen.tsx
git commit -m "feat(driver): show On Deck chip with next runner and projected finish time"
```
