**Status:** Implemented

# Next Runner Up — Driver App

## Context

The driver is responsible for dropping runners off at the start of each leg. Currently the TimingScreen shows who is running *now* but not who runs *next*, so the driver has to remember or look it up separately. Adding a visible "On Deck" indicator removes that mental overhead.

## Design

An amber-labeled chip appears between the current runner info and the elapsed clock, showing the next runner's name, their upcoming leg number, and their projected finish time. The projected finish time is computed server-side as `currentRunnerETA + (nextPaceSecPerMile × nextLegDistanceMiles)`. The chip only renders when a next runner is known; it disappears on the final leg.

### Visual

```
NOW RUNNING
Alice Smith

┌─────────────────────────────────┐
│ ON DECK                  Leg 5  │
│ Bob Jones                       │
│ Est. finish 9:42 AM             │
└─────────────────────────────────┘

────────────────────────────────────

32:14   elapsed
```

If the current runner has no ETA (no assignment / pace set), `nextRunnerEta` is null and the "Est. finish" line is omitted.

## Changes

### Server — `server/src/routes/results.ts`

In the `GET /teams/:id/current` handler, after resolving `currentRunner`, add a query for the next assignment:

```ts
const nextAssignment = await prisma.legAssignment.findFirst({
  where: {
    teamId,
    leg: { legNumber: { gt: activeResult.leg.legNumber } },
  },
  orderBy: { leg: { legNumber: 'asc' } },
  include: { teamMember: true, leg: true },
})
```

Compute the next runner's projected finish time from the current runner's ETA:

```ts
const nextRunnerEta = (eta && nextAssignment)
  ? new Date(
      new Date(eta.eta).getTime() +
      nextAssignment.targetPaceSecPerMile * nextAssignment.leg.distanceMiles * 1000
    ).toISOString()
  : null
```

Add to the JSON response:
```ts
nextRunner: nextAssignment?.teamMember ?? null,
nextLeg: nextAssignment?.leg ?? null,
nextRunnerEta,   // ISO string or null
```

### Type — `apps/driver/src/api.ts`

Add to `CurrentStateInProgress`:
```ts
nextRunner: TeamMember | null
nextLeg: Leg | null
nextRunnerEta: string | null   // ISO string
```

### App state — `apps/driver/src/App.tsx`

Add `nextRunner: string | null`, `nextLegNumber: number | null`, and `nextRunnerEta: string | null` to the `racing` view variant. Populate from `state.nextRunner?.name ?? null`, `state.nextLeg?.legNumber ?? null`, and `state.nextRunnerEta ?? null` in `handleAuth`, `handleStart`, and `handleLap`.

### Component — `apps/driver/src/components/TimingScreen.tsx`

Add `nextRunner: string | null`, `nextLegNumber: number | null`, and `nextRunnerEta: string | null` props. Insert the "On Deck" chip between the runner block and the `<hr>` divider, rendered only when `nextRunner` is non-null. Use the existing `formatTime` helper to display the ETA:

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

## Verification

1. Start a race with at least 2 legs assigned
2. Start leg 1 — timing screen should show "On Deck: [leg 2 runner] · Leg 2"
3. Tap LAP — chip updates to leg 3 runner (or disappears if it was the last leg)
4. On the final leg the chip should be absent
