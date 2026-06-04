# Optimizations for Bad Connectivity

## Feature: Connectivity-Resilient Tracker

Because the KT82 tracker will be used in rural areas with spotty mobile coverage, the app should be designed for reliability and predictability when network quality is poor.

### Goals

- Make the race experience feel fast even on slow or intermittent connections.
- Reduce user frustration by clearly communicating offline/online state.
- Keep key functionality available when the device temporarily loses connectivity.
- Sync updates automatically once connectivity returns.
- Consider a Progressive Web App (PWA) approach for better caching and installability.

### Suggested features

- Offline-capable shell
  - Cache the app shell and core assets with a service worker.
  - Allow the tracker to load quickly on repeat visits, even when the network is slow.
  - Provide a minimal offline fallback if the user opens the app with no connection.

- Data caching and stale-while-revalidate
  - Cache recent team/race data locally so the UI can render immediately.
  - Use a stale-while-revalidate strategy to show the most recent cached view while attempting to refresh in the background.
  - If cached data is stale but available, display it with a notice rather than blocking the user.

- Local pending actions queue
  - Store runner start/finish actions locally when offline.
  - Retry sending those actions automatically once the device reconnects.
  - Show pending status in the UI so the user knows which events are queued.

- Explicit connectivity feedback
  - Show a persistent indicator for offline, poor, or degraded connectivity.
  - Display clear messaging when a submit/save is pending or when data is stale.
  - Avoid destructive actions when the app is offline unless they can safely queue.

- Installable PWA behavior
  - Surface the app as installable on supported devices.
  - Use a web app manifest so the tracker can run in standalone mode and feel more like a native app.
  - Consider push or badge-style notifications for critical race state only if it remains simple and robust.

- Predictable race flow in low bandwidth environments
  - Preload the team’s assigned schedule, leg assignments, and map links ahead of race start.
  - Keep the pre-race overview and start controls reachable with cached data.
  - Avoid requiring fresh network data for the basic race start workflow.

### Why this matters

- A team captain or driver may be in an area with zero coverage during the race.
- The app should not fail completely because connectivity drops at a critical moment.
- PWA-style caching and offline-first design make the tracker more resilient and more pleasant to use in the field.
