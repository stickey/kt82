#!/bin/bash
set -e

# Generate Prisma client with both native and Lambda (rhel) binaries
(cd server && pnpm exec prisma generate)

# Build all workspace packages (4 SPAs + server TypeScript)
pnpm -r build

OUTPUT=/vercel/output

# API path segments - one function directory per segment, all backed by the same Express bundle
API_SEGMENTS=(health auth races legs handoffs teams members assignments results)

# --- Static files ---
mkdir -p "$OUTPUT/static/tracker" "$OUTPUT/static/captain" "$OUTPUT/static/manager" "$OUTPUT/static/driver"
cp -r apps/tracker/dist/. "$OUTPUT/static/tracker/"
cp -r apps/captain/dist/. "$OUTPUT/static/captain/"
cp -r apps/manager/dist/. "$OUTPUT/static/manager/"
cp -r apps/driver/dist/. "$OUTPUT/static/driver/"

# --- Build Express bundle once ---
BUNDLE_FILE="/tmp/kt82-api-bundle.js"
./node_modules/.bin/esbuild api/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --external:@prisma/client \
  --outfile="$BUNDLE_FILE"

# Locate Prisma generated client
if [ -d "node_modules/.prisma/client" ] && [ "$(ls -A node_modules/.prisma/client 2>/dev/null)" ]; then
  PRISMA_CLIENT_SRC="node_modules/.prisma/client"
  echo "Using .prisma/client from root ($(ls $PRISMA_CLIENT_SRC | wc -l) files)"
elif [ -d "server/node_modules/.prisma/client" ] && [ "$(ls -A server/node_modules/.prisma/client 2>/dev/null)" ]; then
  PRISMA_CLIENT_SRC="server/node_modules/.prisma/client"
  echo "Using .prisma/client from server/ ($(ls $PRISMA_CLIENT_SRC | wc -l) files)"
else
  echo "ERROR: .prisma/client not found -- prisma generate may have failed"
  exit 1
fi

# --- Create one function directory per API segment ---
for SEGMENT in "${API_SEGMENTS[@]}"; do
  FUNC_DIR="$OUTPUT/functions/api/${SEGMENT}.func"
  mkdir -p "$FUNC_DIR"
  cp "$BUNDLE_FILE" "$FUNC_DIR/index.js"

  # Copy Prisma client - only mkdir parent, let cp create the leaf dir to avoid client/client/ nesting
  mkdir -p "$FUNC_DIR/node_modules/@prisma" "$FUNC_DIR/node_modules/.prisma"
  cp -rL node_modules/@prisma/client "$FUNC_DIR/node_modules/@prisma/client"
  cp -rL "$PRISMA_CLIENT_SRC" "$FUNC_DIR/node_modules/.prisma/client"

  cat > "$FUNC_DIR/.vc-config.json" << 'EOF'
{"runtime":"nodejs20.x","handler":"index.js","launcherType":"Nodejs"}
EOF
  echo "Created function: api/${SEGMENT}.func"
done

# --- Routing config ---
# Each API segment has an exact-match function that Vercel auto-routes.
# Express receives the original URL so nested paths (/api/races/123) work correctly.
# SPA routes serve index.html for client-side navigation.
cat > "$OUTPUT/config.json" << 'EOF'
{
  "version": 3,
  "routes": [
    {"handle": "filesystem"},
    {"src": "^/tracker", "dest": "/tracker/index.html"},
    {"src": "^/captain", "dest": "/captain/index.html"},
    {"src": "^/manager", "dest": "/manager/index.html"},
    {"src": "^/driver",  "dest": "/driver/index.html"}
  ]
}
EOF

echo "Build output:"; ls -la "$OUTPUT/"
echo "Functions:"; ls -la "$OUTPUT/functions/api/"
