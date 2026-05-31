#!/bin/bash
set -e

# Generate Prisma client from server/prisma/schema.prisma
(cd server && pnpm exec prisma generate)

# Build all workspace packages (4 SPAs + server TypeScript)
pnpm -r build

OUTPUT=/vercel/output
# [[...slug]] = optional catch-all: Vercel auto-routes all /api/* here
# without rewriting the URL, so Express receives the original path
FUNC_DIR="$OUTPUT/functions/api/[[...slug]].func"

# --- Static files ---
mkdir -p "$OUTPUT/static/tracker" "$OUTPUT/static/captain" "$OUTPUT/static/manager" "$OUTPUT/static/driver"
cp -r apps/tracker/dist/. "$OUTPUT/static/tracker/"
cp -r apps/captain/dist/. "$OUTPUT/static/captain/"
cp -r apps/manager/dist/. "$OUTPUT/static/manager/"
cp -r apps/driver/dist/. "$OUTPUT/static/driver/"

# --- Serverless function ---
mkdir -p "$FUNC_DIR"

# Bundle api/index.ts into a single JS file.
# bcrypt and @prisma/client are marked external because they contain native .node binaries
# that esbuild cannot bundle — we copy them manually below.
./node_modules/.bin/esbuild api/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --external:bcrypt \
  --external:@prisma/client \
  --outfile="$FUNC_DIR/index.js"

# Copy native modules into the function's local node_modules.
# Use cp -rL to dereference pnpm symlinks and copy the real files.
mkdir -p "$FUNC_DIR/node_modules/@prisma" "$FUNC_DIR/node_modules/.prisma/client"
cp -rL node_modules/bcrypt "$FUNC_DIR/node_modules/bcrypt"
cp -rL node_modules/@prisma/client "$FUNC_DIR/node_modules/@prisma/client"

# Copy the generated Prisma client (query engine binary lives here)
if [ -d "node_modules/.prisma/client" ]; then
  cp -rL node_modules/.prisma/client "$FUNC_DIR/node_modules/.prisma/client"
fi

# --- Function config ---
cat > "$FUNC_DIR/.vc-config.json" << 'EOF'
{"runtime":"nodejs20.x","handler":"index.js","launcherType":"Nodejs"}
EOF

# --- Routing config ---
cat > "$OUTPUT/config.json" << 'EOF'
{
  "version": 3,
  "routes": [
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
