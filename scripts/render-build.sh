#!/bin/bash
set -e

echo "==> build shared"
pnpm --filter @kt82/shared build

echo "==> prisma generate"
(cd server && pnpm exec prisma generate)

echo "==> prisma migrate deploy"
(cd server && pnpm exec prisma migrate deploy)

echo "==> build server"
pnpm --filter server build

echo "==> build tracker"
pnpm --filter tracker build

echo "==> build captain"
pnpm --filter captain build

echo "==> build manager"
pnpm --filter manager build

echo "==> build driver"
pnpm --filter driver build

echo "==> copy SPA bundles"
mkdir -p server/dist/public/tracker server/dist/public/captain server/dist/public/manager server/dist/public/driver
cp -r apps/tracker/dist/. server/dist/public/tracker/
cp -r apps/captain/dist/. server/dist/public/captain/
cp -r apps/manager/dist/. server/dist/public/manager/
cp -r apps/driver/dist/. server/dist/public/driver/
