#!/bin/sh
set -e
cd /app/server
echo "==> Running database migrations"
node_modules/.bin/prisma migrate deploy
echo "==> Starting server"
exec node dist/bundle.js
