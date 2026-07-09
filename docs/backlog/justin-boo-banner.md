# Justin "Boo, Hiss!!" Banner

## Feature: Rival Runner Callout on Tracker

Team MA (`cmrd0be290001fn7qgi8sadky`) has a runner named Justin, and there's a running joke that whenever Justin is out on a leg, the Tracker should needle him about it. Whenever Justin is the active runner for Team MA, show a "Boo, Hiss!!" banner on that team's Tracker detail screen. Purely cosmetic, no functional impact, and scoped to a single team/runner — this is a fun easter egg, not a general feature.

### Goals

- Show a "Boo, Hiss!!" banner on the Tracker's `TeamDetail` screen exactly when Justin is the currently-running leg for Team MA.
- Never show it for any other runner or any other team.
- Derive it entirely from existing race data — no manual toggle, no admin setting.
- Banner should appear and disappear automatically as legs start/finish, same as the rest of the live tracker UI.

### Suggested approach

`TeamDetail.tsx` (`apps/tracker/src/components/TeamDetail.tsx`) already polls `GET /teams/:teamId/timeline` every 30s and computes `activeItem = timeline.find(t => t.status === 'in-progress')`, where `activeItem.runner` is a `TeamMember { id, teamId, name }`. That's already exactly the data needed:

- Guard on `teamId === 'cmrd0be290001fn7qgi8sadky'` (Team MA specifically — matching by name alone risks catching a different team's Justin).
- Within that guard, check `activeItem?.runner?.name === 'Justin'` (confirm exact roster spelling before hardcoding — captain-entered rosters can have nicknames or a last initial).
- Add a small `JustinBanner` component modeled on the existing `OfflineBanner.tsx` pattern: takes a boolean/message prop, renders `null` when false, otherwise a full-width colored strip with "Boo, Hiss!!".
- Render it in `TeamDetail.tsx` alongside `<OfflineBanner />`, driven by the same `activeItem` the hero card already uses — no new polling, no new state.

### Open questions

- Is "Boo, Hiss!!" the final copy, or should the text be easy to swap for other running jokes later?
- Should this be removed after this year's race, or left in as a permanent fixture for future years (assuming Justin runs again)?

### Why this matters

Team-internal running joke, zero risk to core race functionality, and cheap to build since all the needed data (current runner per team) is already returned by `GET /teams/:id/timeline`.
