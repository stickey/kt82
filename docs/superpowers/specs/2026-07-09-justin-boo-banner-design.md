# Justin "Boo, Hiss!!" Banner Design

**Date:** 2026-07-09
**Status:** Pending Implementation

## Feature

Team MA (`cmrd0be290001fn7qgi8sadky`) has a runner named Justin, and there's a running joke that the Tracker should needle him whenever he's out on a leg. This adds a "Boo, Hiss!!" banner to that team's Tracker `TeamDetail` screen, shown exactly when Justin is the currently-running leg for Team MA.

Purely cosmetic, no functional impact, scoped to a single team/runner. A permanent fixture, not a post-race cleanup item — cheap and isolated enough to leave in for future years.

## Scope

- **Tracker app only.** No server, Captain, Manager, or Driver changes.
- Single hardcoded team ID + runner name + message string. No config object, no admin toggle, no swappable copy — if this joke needs to change next year, it's a small direct edit to the same file.

## Design

### New component: `JustinBanner.tsx`

`apps/tracker/src/components/JustinBanner.tsx`, modeled directly on the existing `OfflineBanner.tsx` pattern:

```tsx
export function JustinBanner({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div style={{
      background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
      borderBottom: '1px solid var(--accent)',
      padding: '10px 18px',
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.06em',
      color: 'var(--accent)',
      textAlign: 'center',
    }}>
      Boo, Hiss!!
    </div>
  )
}
```

Same visual language as `OfflineBanner` — same CSS vars, font, weight, and strip layout — so it reads as a native part of the app's UI rather than a one-off gag element.

### Wiring in `TeamDetail.tsx`

`TeamDetail.tsx` already computes `activeItem = timeline.find(t => t.status === 'in-progress')` from data returned by the existing 30-second `GET /teams/:teamId/timeline` poll. Add one derived boolean next to that computation:

```ts
const showJustinBanner = teamId === 'cmrd0be290001fn7qgi8sadky' && activeItem?.runner?.name === 'Justin'
```

- Guarding on `teamId` first (not just runner name) avoids a false match if another team ever has its own Justin.
- `activeItem?.runner?.name === 'Justin'` — confirmed exact roster spelling in `resources/seeds/roster.ma.csv` (no last initial, no nickname).

Render `<JustinBanner show={showJustinBanner} />` immediately below the top bar (back/share buttons), above `<OfflineBanner />`:

```tsx
<div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
  <div className="flex items-center justify-between px-[18px] py-3" ...>
    {/* top bar, unchanged */}
  </div>

  <JustinBanner show={showJustinBanner} />
  <OfflineBanner message={bannerMessage} />
  ...
```

No new state, no new polling. `showJustinBanner` is recomputed on every render from data already being fetched, so the banner appears and disappears automatically as legs start and finish — same lifecycle as the rest of the live tracker UI.

## Testing

No server or API changes — this is a presentational-only Tracker component.

- Manual verification: use the seeded Team MA roster/assignments data, drive Justin's leg through in-progress via the Driver app, and confirm the banner appears on Team MA's Tracker `TeamDetail` screen and nowhere else (other teams, other runners on Team MA, pre-race and completed states).
- If the tracker app has a component test setup, add a test asserting `JustinBanner` renders `null` when `show={false}` and the "Boo, Hiss!!" strip when `show={true}` — trivial given the component takes a single boolean prop.

## Files Changed

| File | Change |
|---|---|
| `apps/tracker/src/components/JustinBanner.tsx` | New — banner component, modeled on `OfflineBanner` |
| `apps/tracker/src/components/TeamDetail.tsx` | Add `showJustinBanner` derived boolean; render `<JustinBanner />` above `<OfflineBanner />` |
