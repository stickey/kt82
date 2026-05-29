# Manager App

Race director console for configuring the KT82 relay race. Used before and during the event.

## What It Does

- **Race tab:** Create the race with a name and date
- **Legs tab:** Define each leg (number, name, distance in miles) and its handoff point (name, optional address and lat/lng for navigation)
- **Teams tab:** Create teams, assign a PIN to each team captain, rename or reset teams (reset clears assignments and results), export a printable PIN list

## Running

The API server must be running first:
```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev
```

```bash
# From repo root
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter manager dev
```

Opens at **http://localhost:5175**

## Auth

Login with the admin password.

Dev credential: `kt82admin`

## File Structure

```
src/
  api.ts              — admin-password-bearing API client factory
  App.tsx             — login gate, tab routing
  components/
    LoginScreen.tsx   — admin password entry
    TabNav.tsx        — tab bar (Race / Legs / Teams)
    Modal.tsx         — reusable modal wrapper
    ConfirmDialog.tsx — reusable confirm/cancel dialog
  tabs/
    RaceTab.tsx       — create/view race
    LegsTab.tsx       — add/edit/delete legs and handoff points
    TeamsTab.tsx      — add/rename/reset/export teams
```
