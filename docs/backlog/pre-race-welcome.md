# Pre-Race Tracker Landing Page

## Feature: Team Pre-Race Overview

When a team has not yet started the race, the tracker should show a polished pre-race landing page for that team.

### Goals

- Show a race countdown and fanfare above the page.
- Display the assigned team start time prominently.
- Show estimated arrival times for every handoff along the route.
- Show the runner assigned to each leg.
- Include quick links to the start and end location for each leg.
- Highlight the estimated race end time in Hermann.

### Behavior

- This page is only shown before the team has started the first leg.
- Once the team has started the race this view is not available.
- Make it clear that this is only an estimate.
- The page should use the team's assigned start time to calculate the countdown and all handoff ETAs.
- The hero area should include the team start time plus the estimated race completion time in Hermann.
- Above the hero, show celebratory copy and a countdown timer to the team start.
- Each leg row should include:
  - leg number and name
  - assigned runner
  - estimated arrival at the handoff
  - link to start location
  - link to end location

### Data requirements

- This likely requires a database update so each team has an assigned start time.
- The ETA calculation should be based on the team start time and the configured leg distances/pace targets.
- The UI should be able to compute per-leg handoff arrivals before any race results exist.

### Example

- Team `RunGMC` is assigned a 7:00 AM start.
- Before the race begins, the tracker should show:
  - fanfare and countdown to 7:00 AM
  - hero text with start time and estimated finish time in Hermann
  - a table/list of legs with assigned runner, handoff ETA, and location links

### Notes

- This should feel like a pre-race welcome hub for the team, not the live race view.
- Keep the page mobile-first and easy to read at a glance.
