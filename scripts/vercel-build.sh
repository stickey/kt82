#!/bin/bash
set -e

# Generate Prisma client with both native and Lambda (rhel) binaries
(cd server && pnpm exec prisma generate)

# Build all workspace packages (4 SPAs + server TypeScript)
pnpm -r build

# Write SPAs to public/ — standard Vercel static output dir.
# Do NOT write to /vercel/output/ — that activates Build Output API and
# suppresses standard api/ function detection.
mkdir -p public/tracker public/captain public/manager public/driver
cp -r apps/tracker/dist/. public/tracker/
cp -r apps/captain/dist/. public/captain/
cp -r apps/manager/dist/. public/manager/
cp -r apps/driver/dist/. public/driver/

echo "Static files:"
ls -la public/
