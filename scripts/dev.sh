#!/usr/bin/env bash
# Runs all 5 dev processes in the foreground. Keep this terminal open; Ctrl+C to stop all.
#
# Usage:
#   ./scripts/dev.sh                  # main working tree
#   ./scripts/dev.sh <worktree-id>    # a specific worktree (e.g. a1263e22077fad61c)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$HOME/.nvm/versions/node/v20.11.0/bin"
export PATH="$NODE_BIN:$PATH"

AGENT_ID="${1:-}"

if [[ -z "$AGENT_ID" ]]; then
  WORKTREE="$REPO_ROOT"
else
  WORKTREE="$REPO_ROOT/.claude/worktrees/agent-${AGENT_ID}"
fi

if [[ ! -d "$WORKTREE" ]]; then
  echo "Error: directory not found: $WORKTREE" >&2
  exit 1
fi

echo "Starting KT82 dev stack from: $WORKTREE"
echo ""
echo "  server   → http://localhost:3001"
echo "  tracker  → http://localhost:5173/tracker"
echo "  captain  → http://localhost:5174/captain"
echo "  manager  → http://localhost:5175/manager"
echo "  driver   → http://localhost:5176/driver"
echo ""

exec pnpm exec concurrently \
  --names "server,tracker,captain,manager,driver" \
  --prefix-colors "cyan,green,yellow,blue,magenta" \
  "cd '$WORKTREE/server' && pnpm dev" \
  "cd '$WORKTREE' && pnpm --filter tracker dev" \
  "cd '$WORKTREE' && pnpm --filter captain dev" \
  "cd '$WORKTREE' && pnpm --filter manager dev" \
  "cd '$WORKTREE' && pnpm --filter driver dev"
