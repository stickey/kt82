#!/bin/bash
set -e

# Generate Prisma client (needs to run before tsc)
(cd server && pnpm exec prisma generate)

# Apply pending database migrations
(cd server && pnpm exec prisma migrate deploy)

# Build server TypeScript and all SPAs sequentially (parallel builds OOM on Render free tier)
pnpm -r --workspace-concurrency=1 build

# Copy SPA bundles into server/dist/public/ for Express static serving
mkdir -p server/dist/public/tracker server/dist/public/captain server/dist/public/manager server/dist/public/driver
cp -r apps/tracker/dist/. server/dist/public/tracker/
cp -r apps/captain/dist/. server/dist/public/captain/
cp -r apps/manager/dist/. server/dist/public/manager/
cp -r apps/driver/dist/. server/dist/public/driver/
