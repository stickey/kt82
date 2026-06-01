# ── Builder ──────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9

WORKDIR /app

# Copy manifest files first so dependency install layer is cached separately from source
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json server/
COPY packages/shared/package.json packages/shared/
COPY apps/tracker/package.json apps/tracker/
COPY apps/captain/package.json apps/captain/
COPY apps/manager/package.json apps/manager/
COPY apps/driver/package.json apps/driver/

# Install all deps (dev + prod) needed for building; skip lifecycle scripts because
# source files aren't present yet and postinstall hooks (e.g. Prisma) need them later
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy all source
COPY . .

# Generate Prisma client (output goes to node_modules/.prisma/client per schema.prisma)
RUN pnpm --filter server exec prisma generate

# Build all four SPA apps with Vite
RUN pnpm --filter tracker build
RUN pnpm --filter captain build
RUN pnpm --filter manager build
RUN pnpm --filter driver build

# Bundle server + @kt82/shared into a single CJS file using esbuild.
# All other server deps remain external and are satisfied by node_modules at runtime.
RUN mkdir -p server/dist/public && node scripts/esbuild-server.js

# Stage SPA bundles alongside the server bundle so __dirname/public/ resolves correctly
RUN mkdir -p server/dist/public/tracker server/dist/public/captain \
             server/dist/public/manager server/dist/public/driver && \
    cp -r apps/tracker/dist/. server/dist/public/tracker/ && \
    cp -r apps/captain/dist/. server/dist/public/captain/ && \
    cp -r apps/manager/dist/. server/dist/public/manager/ && \
    cp -r apps/driver/dist/. server/dist/public/driver/

# Remove devDependencies from node_modules to keep the runtime image smaller
RUN pnpm prune --prod

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# node_modules: root .pnpm store + .prisma/client generated code + hoisted packages
COPY --from=builder /app/node_modules ./node_modules

# server/node_modules: symlinks to production deps in the root .pnpm store
COPY --from=builder /app/server/node_modules ./server/node_modules

# server/dist: bundled server JS + SPA static files in public/
COPY --from=builder /app/server/dist ./server/dist

# server/prisma: schema and migrations (needed by prisma migrate deploy at startup)
COPY --from=builder /app/server/prisma ./server/prisma

COPY --from=builder /app/server/package.json ./server/package.json

COPY scripts/docker-start.sh /app/scripts/docker-start.sh
RUN chmod +x /app/scripts/docker-start.sh

ENV NODE_ENV=production

CMD ["/app/scripts/docker-start.sh"]
