#!/bin/bash
set -e

# Generate Prisma client from server/prisma/schema.prisma
(cd server && pnpm exec prisma generate)

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
mkdir -p "$FUNC_DIR/node_modules/@prisma" "$FUNC_DIR/node_modules/.prisma/client"
cp -rL node_modules/@prisma/client "$FUNC_DIR/node_modules/@prisma/client"
if [ -d "node_modules/.prisma/client" ]; then
  cp -rL node_modules/.prisma/client "$FUNC_DIR/node_modules/.prisma/client"
fi

# --- Function config ---
cat > "$FUNC_DIR/.vc-config.json" << 'EOF'
{"runtime":"nodejs20.x","handler":"index.js","launcherType":"Nodejs"}
EOF

# --- Routing config ---
# Two explicit routes to avoid Vercel regex quirks with optional capture groups:
# - exact /api match
# - any /api/<subpath> match
cat > "$OUTPUT/config.json" << 'EOF'
{
  "version": 3,
  "routes": [
    {"src": "^/api$", "dest": "/api"},
    {"src": "^/api/.*", "dest": "/api"},
    {"handle": "filesystem"},
    {"src": "^/tracker(/.*)?$", "dest": "/tracker/index.html"},
    {"src": "^/captain(/.*)?$", "dest": "/captain/index.html"},
    {"src": "^/manager(/.*)?$", "dest": "/manager/index.html"},
    {"src": "^/driver(/.*)?$", "dest": "/driver/index.html"}
  ]
}
EOF

echo "Build output:"
ls -la "$OUTPUT/"
echo "Function files:"
ls -la "$FUNC_DIR/"
