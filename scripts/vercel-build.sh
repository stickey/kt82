#!/bin/bash
set -e

# Generate Prisma client with both native and Lambda (rhel) binaries
(cd server && pnpm exec prisma generate)

# Build all workspace packages (4 SPAs + server TypeScript)
pnpm -r build

OUTPUT=/vercel/output
FUNC_DIR="$OUTPUT/functions/index.func"

# --- Static files ---
mkdir -p "$OUTPUT/static/tracker" "$OUTPUT/static/captain" "$OUTPUT/static/manager" "$OUTPUT/static/driver"
cp -r apps/tracker/dist/. "$OUTPUT/static/tracker/"
cp -r apps/captain/dist/. "$OUTPUT/static/captain/"
cp -r apps/manager/dist/. "$OUTPUT/static/manager/"
cp -r apps/driver/dist/. "$OUTPUT/static/driver/"

# --- Serverless function ---
mkdir -p "$FUNC_DIR"

./node_modules/.bin/esbuild api/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --external:@prisma/client \
  --outfile="$FUNC_DIR/index.js"

# Copy Prisma client + generated query engine binary.
# Only mkdir the parent — let cp create the leaf dir to avoid client/client/ nesting.
mkdir -p "$FUNC_DIR/node_modules/@prisma" "$FUNC_DIR/node_modules/.prisma"
cp -rL node_modules/@prisma/client "$FUNC_DIR/node_modules/@prisma/client"

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

cat > "$FUNC_DIR/.vc-config.json" << 'EOF'
{"runtime":"nodejs20.x","handler":"index.js","launcherType":"Nodejs"}
EOF

# --- Routing config ---
# Function is at / (index.func) so it handles all paths.
# API route uses a capture group so dest = original path — no URL rewriting,
# Express always receives the real request URL.
# SPA routes after filesystem serve index.html for client-side navigation.
cat > "$OUTPUT/config.json" << 'EOF'
{
  "version": 3,
  "routes": [
    {"src": "^(/api.*)", "dest": "$1"},
    {"handle": "filesystem"},
    {"src": "^/tracker", "dest": "/tracker/index.html"},
    {"src": "^/captain", "dest": "/captain/index.html"},
    {"src": "^/manager", "dest": "/manager/index.html"},
    {"src": "^/driver",  "dest": "/driver/index.html"}
  ]
}
EOF

echo "Build output:"
ls -la "$OUTPUT/"
echo "Function files:"
ls -la "$FUNC_DIR/"
