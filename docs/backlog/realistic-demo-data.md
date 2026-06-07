# Realistic Demo Data

## Feature: API Replay Script for Demo/Testing Setup

To realistically test and demo the app, there needs to be a way to seed the database with realistic timing data — leg splits that took 30–50 minutes each — without actually waiting that long. Quickly tapping through the driver app and registering sub-minute splits doesn't produce realistic data, and many screens (tracker ETA, captain view, leg progress, leg map) adjust dynamically based on timing data and look wrong with unrealistic splits.

### Goals

- Be able to set up the app in a mid-race state with realistic leg splits for local testing.
- Be able to reset to a known demo state quickly and repeatably.
- Not require any changes to app code or timer behavior.
- Support showing the driver timing screen with a realistic elapsed time (e.g., "43:12") for the current in-progress leg.

### Proposed approach: API replay script with backdated timestamps

Add a new seed script (similar to the existing `seed:legs`, `seed:roster`, `seed:assignments` scripts) that calls the real API endpoints in sequence — POST to start a leg, PATCH to finish it — with timestamps backdated by realistic amounts.

**Example behavior:**
- Accepts a race ID, team ID, and number of legs to simulate
- Calls `POST /teams/:id/results` with a `startedAt` backdated to N hours ago
- Calls `PATCH /results/:id` with a `finishedAt` at `startedAt + realistic split duration`
- Repeats for each completed leg, chaining leg start times naturally
- Leaves the final leg in progress (no `finishedAt`), started X minutes ago

After running the script, the driver timing screen opens showing realistic elapsed time because `Date.now() - startedAt` is naturally that far back. The tracker and captain apps see realistic completed splits.

**Why this approach:**
- Uses the real API flow — produces identical data to a real race
- No app changes required
- Timer stability unaffected (no changes to how elapsed time is calculated)
- Naturally exercises the same code paths as race day

### Alternatives considered

- **Clock multiplier param (`?clockMultiplier=60`):** Makes time pass N× faster in the app. Lets you drive the full flow in ~2 minutes real time but touches timer calculations and produces a confusing display during use.
- **Direct DB fixture via Prisma:** Faster to run and easier to make idempotent, but bypasses the API — doesn't exercise the same code paths.

### Configuration the script should support

- Race ID and team ID (required)
- Number of legs to complete before leaving one in progress
- Pace per leg (or use the team's target pace from assignments)
- How long ago the current in-progress leg started
- Optional: pace variance to make splits feel natural rather than uniform
