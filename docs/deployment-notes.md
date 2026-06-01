# Deployment Notes

History and technical decisions behind KT82's production deployment. Read this before changing platforms or modifying the build pipeline.

---

## Current Setup: Render + Docker (v1.1.0, 2026-06-01)

### Why Docker on Render

KT82 is a pnpm workspaces monorepo — four Vite+React SPAs, one Express API, and a shared TypeScript package. This creates genuine tension with any PaaS that builds from source, because:

1. **devDependencies vs dependencies at build time.** Build tools (Vite, TypeScript, tsx) are traditionally in devDependencies. PaaS platforms that set `NODE_ENV=production` during install skip devDeps entirely — the build then fails because the build tools aren't installed.

2. **Workspace module resolution at runtime.** `@kt82/shared` has `"main": "src/index.ts"` (TypeScript source). Node.js cannot execute TypeScript. In dev this is fine because `tsx` handles it. In production you need either a build step that compiles shared, or a bundler that inlines it.

3. **`moduleResolution: NodeNext` is strict.** The server's tsconfig uses NodeNext, which has different (stricter) rules for type discovery than the older `node` resolution. On Render's git-backed runtime, `@types/node` wasn't reliably auto-discovered, causing TypeScript compilation failures that didn't reproduce locally.

4. **Prisma binary targets.** Prisma requires platform-specific native binaries. The git-backed Node.js runtime on Render uses an RHEL-based environment (`rhel-openssl-3.0.x`). This target must be explicitly listed in `schema.prisma`'s `binaryTargets`, and `prisma generate` must run during the build.

Docker eliminates all four problems. The Dockerfile fully controls the environment — same base image for builder and runtime, explicit install and build steps in a known order, no `NODE_ENV` ambiguity during install.

### How the Build Works

```
Dockerfile (two stages, both node:20-slim)

BUILDER
  1. pnpm install --frozen-lockfile --ignore-scripts
     (--ignore-scripts avoids Prisma postinstall before source is available)
  2. COPY all source
  3. pnpm --filter server exec prisma generate
     → writes generated client to node_modules/.prisma/client/
  4. pnpm --filter {tracker,captain,manager,driver} build
     → Vite reads @kt82/shared via "main": "src/index.ts" (TypeScript source, handled natively by esbuild+Vite)
  5. node scripts/esbuild-server.js
     → bundles server/src/index.ts + @kt82/shared into server/dist/bundle.js
     → all other server deps (express, @prisma/client, etc.) remain external
  6. cp SPA dist/ → server/dist/public/{tracker,captain,manager,driver}/
  7. pnpm prune --prod  (removes devDependencies from node_modules)

RUNTIME
  COPY node_modules/         (pruned, includes .prisma/client/)
  COPY server/node_modules/  (production dep symlinks)
  COPY server/dist/          (bundle.js + public/ SPA bundles)
  COPY server/prisma/        (schema.prisma + migrations/)
  CMD: scripts/docker-start.sh
```

### Why esbuild Instead of tsc for the Server

`@kt82/shared` uses `"main": "src/index.ts"`. If we compiled the server with `tsc`, the output would still have `require('@kt82/shared')` pointing to TypeScript — which Node.js can't run.

Options considered:
- **Compile shared to JS first, update main to `dist/index.js`**: Breaks Vite/Rollup. Vite bundles the SPAs and also imports `@kt82/shared`. When `main` points to CJS-compiled output (CommonJS `module.exports` re-exports), Rollup can't statically analyze named exports — it fails with `"createApiClient" is not exported by ...`. This was discovered by actually building inside Docker.
- **TypeScript project references**: Adds complexity; still requires correct `main` and interop handling.
- **esbuild**: Handles TypeScript natively. When bundling the server, it follows `@kt82/shared`'s `main: src/index.ts`, processes the TypeScript source, and inlines it into the bundle. No `main` change needed. Vite (which also uses esbuild internally) continues to work with the TypeScript source. This is the approach used.

### Critical invariant

**Do not change `"main": "src/index.ts"` in `packages/shared/package.json` to a compiled path.** See above — it breaks Vite's Rollup bundler. If you need to ship compiled shared package output (e.g. for an npm publish), use the `exports` field with conditions rather than changing `main`.

### Port Handling

Render injects `PORT` as an environment variable (typically `10000` for Docker services). The server already handles this:

```typescript
const port = Number(process.env.PORT) || 3001
app.listen(port, ...)
```

No Dockerfile change is needed. `EXPOSE` is documentation only.

### `packages/shared` build script

`packages/shared/package.json` has a `"build": "tsc"` script and `outDir: dist` in its tsconfig. This is used only by `scripts/render-build.sh` (the legacy git-backed build script, now superseded by Docker). The Dockerfile does NOT run `pnpm --filter @kt82/shared build` — esbuild processes the TypeScript source directly.

---

## Vercel Attempt (Abandoned, ~18 commits)

Vercel was attempted before Render. It was abandoned after extensive work because the app's architecture doesn't fit Vercel's model.

### Why Vercel Doesn't Fit

Vercel's model: **serverless functions + CDN static assets**. You deploy either a static site or short-lived serverless functions (or both via their "full-stack" framework support for Next.js etc.).

KT82's model: **Express monolith** that serves both the API and static files from the same process. This is a traditional server, not a serverless function.

Mapping Express to a serverless function is possible in principle — you export the Express app as a Vercel serverless handler. The problem is **routing**: Vercel's CDN sits in front of your functions and routes requests based on `vercel.json` rules. Getting `/api/*` requests through to the Express function while letting Vercel serve the SPA static bundles required complex routing configuration that proved extremely brittle.

### Specific Failures

**API routing (most of the iteration)**

The core problem: how does a request to `/api/races` reach the Express function rather than being served as a static 404?

Attempts (in rough order):
1. `api/[...path].ts` catch-all serverless function exporting `app` from `server/src/app.ts`. Added `vercel.json` rewrites to route `/api/*` to the function. Broke because Vercel's routing resolves the function URL differently than expected — routing loops, double-slashing, etc.
2. Build Output API (`api/index.func/`) — Vercel's lower-level format that gives explicit control over function paths. More configuration surface area but the routing still didn't behave as documented.
3. Explicit static route list in `vercel.json` (listing every `/api/races`, `/api/legs`, etc.) — too brittle and required keeping the list in sync with Express routes.
4. `[[...slug]]` catch-all function — closest to working, but routing loops appeared where the SPA rewrites and the API catch-all conflicted.
5. Removed `framework: null` override — Vercel kept auto-detecting the wrong framework.
6. Final `vercel.json` state (commit `ab023d2`): had SPA rewrites but API routing was still broken. Abandoned at this point.

**bcrypt → bcryptjs (commit `53597af`)**

`bcrypt` uses native Node.js addons. Vercel's serverless runtime doesn't support native addons bundled from local node_modules in the standard way. Replaced with `bcryptjs` (pure JavaScript, no native bindings). This change was kept in the Render/Docker deployment because `bcryptjs` works fine and avoids a whole category of native-module issues.

**Prisma binary targets (commits `8507cc1`, `73b6dfc`, `9b16c59`)**

Vercel's lambda environment is RHEL-based. Added `rhel-openssl-3.0.x` to `binaryTargets` in `schema.prisma`. The Prisma client output path also needed to be pinned explicitly because Vercel's build directory structure differs from local. Multiple attempts to get the `.prisma/client/` generated output to land somewhere the function could find it at runtime.

**Framework auto-detection (commit `59fed33`)**

Vercel was auto-detecting the presence of multiple Vite configs and trying to build the monorepo as a single Vite project. Had to disable with `"framework": null` and explicit build/output configuration.

**pnpm workspace + Vercel builds**

Vercel's build environment didn't reliably handle `pnpm install --frozen-lockfile` in a monorepo where the lockfile references all workspace packages. Required workarounds that felt fragile.

### Lesson

Vercel works very well for Next.js apps and static sites. For a traditional Express server serving multiple SPAs from a monorepo — especially one that needs Prisma, pnpm workspaces, and a shared TypeScript package — the operational complexity outweighs any benefit. The fundamental mismatch is architectural, not a configuration problem that can be fixed with enough `vercel.json` iteration.

If Vercel support is ever needed in the future, the cleanest path would be to **decouple** the architecture: deploy the four SPAs as separate Vercel static projects, and deploy the API separately (Render/Railway/Fly.io). This matches Vercel's strengths rather than fighting them.

---

## Environment Summary

| Variable | Where to set | Purpose |
|----------|-------------|---------|
| `DATABASE_URL` | Render dashboard | PostgreSQL connection string |
| `ADMIN_PASSWORD_HASH` | Render dashboard | bcrypt hash of admin password |
| `PORT` | Injected by Render | Server listen port (auto, don't override) |
| `NODE_ENV` | Set to `production` in `docker-start.sh` | Activates static file serving in Express |
