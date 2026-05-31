#!/bin/bash
set -e

# Generate Prisma client. output is pinned to repo-root/node_modules/.prisma/client
# in schema.prisma so it lands where @prisma/client (hoisted to root) can find it.
(cd server && pnpm exec prisma generate)
echo "=== prisma generate output locations ==="
find . -maxdepth 7 -path "*/.prisma/client" -type d 2>/dev/null | grep -v ".git"
find . -maxdepth 7 -name "libquery_engine*" 2>/dev/null | grep -v ".git" | head -10

# Build all workspace packages (4 SPAs + server TypeScript)
pnpm -r build

OUTPUT=/vercel/output
FUNC_DIR="$OUTPUT/functions/api.func"

# --- Static files ---
mkdir -p "$OUTPUT/static/tracker" "$OUTPUT/static/captain" "$OUTPUT/static/manager" "$OUTPUT/static/driver"
cp -r apps/tracker/dist/. "$OUTPUT/static/tracker/"
cp -r apps/captain/dist/. "$OUTPUT/static/captain/"
cp -r apps/manager/dist/. "$OUTPUT/static/manager/"
cp -r apps/driver/dist/. "$OUTPUT/static/driver/"

# --- Serverless function ---
mkdir -p "$FUNC_DIR"

# Bundle api/index.ts. bcryptjs is pure-JS so esbuild bundles it directly.
# Only @prisma/client is external (native query engine binary).
./node_modules/.bin/esbuild api/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --external:@prisma/client \
  --outfile="$FUNC_DIR/index.js"

# Copy Prisma client and its generated query engine binary.
# With pnpm shamefully-hoist, @prisma/client lands at root node_modules but
# prisma generate (run from server/) may write .prisma/client to either root or
# server/node_modules depending on where it finds @prisma/client installed.
# mkdir only the parent dirs — NOT the destination itself.
# cp -r copies into an existing dir (creating client/client/), so let cp create the leaf.
mkdir -p "$FUNC_DIR/node_modules/@prisma" "$FUNC_DIR/node_modules/.prisma"
cp -rL node_modules/@prisma/client "$FUNC_DIR/node_modules/@prisma/client"

echo "Locating .prisma/client generated files..."
if [ -d "node_modules/.prisma/client" ] && [ "$(ls -A node_modules/.prisma/client 2>/dev/null)" ]; then
  cp -rL node_modules/.prisma/client "$FUNC_DIR/node_modules/.prisma/client"
  echo "Copied .prisma/client from root ($(ls node_modules/.prisma/client | wc -l) files)"
elif [ -d "server/node_modules/.prisma/client" ] && [ "$(ls -A server/node_modules/.prisma/client 2>/dev/null)" ]; then
  cp -rL server/node_modules/.prisma/client "$FUNC_DIR/node_modules/.prisma/client"
  echo "Copied .prisma/client from server/ ($(ls server/node_modules/.prisma/client | wc -l) files)"
else
  echo "ERROR: .prisma/client not found — prisma generate may have failed"
  exit 1
fi

# --- Function config ---
cat > "$FUNC_DIR/.vc-config.json" << 'EOF'
{"runtime":"nodejs20.x","handler":"index.js","launcherType":"Nodejs"}
EOF

# --- Routing config ---
# /api catch-all uses the [[...slug]] function path so Vercel routes /api and
# /api/* to the same function without URL rewriting or routing loops.
cat > "$OUTPUT/config.json" << 'EOF'
{
  "version": 3,
  "routes": [
    {"src": "/api/health",      "dest": "/api"},
    {"src": "/api/auth",        "dest": "/api"},
    {"src": "/api/races",       "dest": "/api"},
    {"src": "/api/legs",        "dest": "/api"},
    {"src": "/api/handoffs",    "dest": "/api"},
    {"src": "/api/teams",       "dest": "/api"},
    {"src": "/api/members",     "dest": "/api"},
    {"src": "/api/assignments", "dest": "/api"},
    {"src": "/api/results",     "dest": "/api"},
    {"handle": "filesystem"},
    {"src": "/tracker", "dest": "/tracker/index.html"},
    {"src": "/captain", "dest": "/captain/index.html"},
    {"src": "/manager", "dest": "/manager/index.html"},
    {"src": "/driver",  "dest": "/driver/index.html"}
  ]
}
EOF

echo "Build output:"
ls -la "$OUTPUT/"
echo "Function files:"
ls -la "$FUNC_DIR/"
