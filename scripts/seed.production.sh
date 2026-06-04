#!/usr/bin/env bash
set -euo pipefail

# ── Fill these in before running ────────────────────────────────────────────
RACE_ID="cmpwnogw6000312ekdtfzr8d6"   # paste race ID here (from Manager app URL or DB)
TEAM_ID="cmpwnz4ba000512ek48y81u6d"   # paste team ID here (from Manager app URL or DB)
# ────────────────────────────────────────────────────────────────────────────

if [[ -z "$RACE_ID" || -z "$TEAM_ID" ]]; then
  echo "ERROR: Set RACE_ID and TEAM_ID at the top of this script before running." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load production DATABASE_URL
# shellcheck source=../server/.env.supabase
source "$REPO_ROOT/server/.env.supabase"

export PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH"

cd "$REPO_ROOT/server"

echo "==> Seeding legs for race $RACE_ID..."
pnpm seed:legs "$RACE_ID" "$REPO_ROOT/resources/seeds/KT82legs.csv"

echo "==> Seeding roster for team $TEAM_ID..."
pnpm seed:roster "$TEAM_ID" "$REPO_ROOT/resources/seeds/roster.rungmc.csv"

ASSIGNMENTS_CSV="$REPO_ROOT/resources/seeds/assignments.csv"
if [[ -s "$ASSIGNMENTS_CSV" ]]; then
  echo "==> Seeding assignments for team $TEAM_ID..."
  pnpm seed:assignments "$TEAM_ID" "$ASSIGNMENTS_CSV"
else
  echo "==> Skipping assignments (resources/seeds/assignments.csv is empty)."
fi

echo "Done."
