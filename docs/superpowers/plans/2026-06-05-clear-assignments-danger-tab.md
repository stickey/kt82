# Clear Assignments (Danger Tab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a race-wide "Clear Assignments" action to the Manager Danger tab that deletes all leg assignments, cascades to timing results, and unlocks all teams.

**Architecture:** New `DELETE /races/:id/assignments` admin endpoint handles the server side in a single transaction. DangerTab gets a new card section + confirm dialog wired to that endpoint. No schema changes, no new files.

**Tech Stack:** Express + Prisma (server), React + Tailwind (DangerTab)

---

### Task 1: Server route + tests

**Files:**
- Modify: `server/src/routes/races.ts` (add new route)
- Modify: `server/src/__tests__/races.test.ts` (add test suite)

- [ ] **Step 1: Write the failing tests**

Add this `describe` block at the end of `server/src/__tests__/races.test.ts` (before the closing of the file):

```typescript
describe('DELETE /api/races/:id/assignments', () => {
  it('returns 401 without admin password', async () => {
    const race = await createRace()
    const res = await request(app).delete(`/api/races/${race.id}/assignments`)
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown race', async () => {
    const res = await request(app)
      .delete('/api/races/nonexistent/assignments')
      .set(ADMIN)
    expect(res.status).toBe(404)
  })

  it('deletes all assignments and results, unlocks teams, leaves legs and members intact', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)
    const team = await createTeam(race.id)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)
    await createLegResult(team.id, leg.id)
    // Lock the team to verify it gets unlocked
    await prisma.team.update({ where: { id: team.id }, data: { locked: true } })

    const res = await request(app)
      .delete(`/api/races/${race.id}/assignments`)
      .set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })

    expect(await prisma.legAssignment.count()).toBe(0)
    expect(await prisma.legResult.count()).toBe(0)
    const updatedTeam = await prisma.team.findUnique({ where: { id: team.id } })
    expect(updatedTeam?.locked).toBe(false)
    // Legs and members are preserved
    expect(await prisma.leg.count({ where: { raceId: race.id } })).toBe(1)
    expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/races.test.ts
```

Expected: the three new tests fail with 404 or similar (route doesn't exist yet).

- [ ] **Step 3: Add the route to `server/src/routes/races.ts`**

Insert this block after the `DELETE /races/:id/results` route (around line 54) and before the `DELETE /races/:id` route:

```typescript
router.delete('/races/:id/assignments', adminAuth, async (req, res, next) => {
  try {
    const race = await prisma.race.findUnique({ where: { id: req.params.id } })
    if (!race) return res.status(404).json({ error: 'Race not found' })
    await prisma.$transaction(async (tx) => {
      await tx.legResult.deleteMany({ where: { leg: { raceId: req.params.id } } })
      await tx.legAssignment.deleteMany({ where: { leg: { raceId: req.params.id } } })
      await tx.team.updateMany({ where: { raceId: req.params.id }, data: { locked: false } })
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/races.test.ts
```

Expected: all tests in the file pass, including the full existing suite.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/races.ts server/src/__tests__/races.test.ts
git commit -m "feat(server): add DELETE /races/:id/assignments endpoint"
```

---

### Task 2: DangerTab UI

**Files:**
- Modify: `apps/manager/src/tabs/DangerTab.tsx`

- [ ] **Step 1: Add `clearAssignments` to the `Confirm` union type**

In `DangerTab.tsx`, find the `Confirm` type (around line 12):

```typescript
type Confirm =
  | { type: 'clearResults' }
  | { type: 'deleteTeam'; team: Team }
  | { type: 'wipeAll' }
```

Replace with:

```typescript
type Confirm =
  | { type: 'clearResults' }
  | { type: 'clearAssignments' }
  | { type: 'deleteTeam'; team: Team }
  | { type: 'wipeAll' }
```

- [ ] **Step 2: Add the handler branch in `handleConfirm`**

Find the `handleConfirm` function. After the `clearResults` branch and before `deleteTeam`:

```typescript
      if (confirm.type === 'clearResults') {
        await api.delete(`/races/${race.id}/results`)
        setSuccess('Timing data cleared.')
      } else if (confirm.type === 'clearAssignments') {
        await api.delete(`/races/${race.id}/assignments`)
        setSuccess('Assignments cleared.')
      } else if (confirm.type === 'deleteTeam') {
```

- [ ] **Step 3: Add the new UI section**

In the JSX, find the comment `{/* Delete a team */}` and insert the new card immediately before it:

```tsx
      {/* Clear assignments */}
      <div className="bg-gray-900 rounded-xl p-4 border border-red-900/40">
        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">Clear Assignments</p>
        <p className="text-gray-400 text-sm mb-4">
          Deletes all leg assignments for every team. Timing data is also cleared since it depends on assignments. Teams are unlocked so assignments can be re-entered.
        </p>
        <button
          onClick={() => openConfirm({ type: 'clearAssignments' })}
          className="bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors min-h-[44px]"
        >
          Clear Assignments
        </button>
      </div>
```

- [ ] **Step 4: Add the confirm dialog**

In the confirm dialogs section at the bottom of the JSX, after `{confirm?.type === 'clearResults' && ...}` and before `{confirm?.type === 'deleteTeam' && ...}`:

```tsx
      {confirm?.type === 'clearAssignments' && (
        <ConfirmDialog
          title="Clear Assignments"
          message={`Clear all assignments for ${race.name}? Timing data will also be deleted. Teams will be unlocked.`}
          confirmLabel={busy ? 'Clearing…' : 'Clear Assignments'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
```

- [ ] **Step 5: Verify the TypeScript build locally**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter manager build
```

Expected: exits 0 with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/manager/src/tabs/DangerTab.tsx
git commit -m "feat(manager): add Clear Assignments section to Danger tab"
```
