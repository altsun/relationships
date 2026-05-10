# Agent Guide

This file gives AI agents the context needed to work on this repo without re-discovering it.

## Architecture in One Paragraph

Monorepo with two apps sharing a pnpm lock file at the root. `apps/api` is a Hono.js API deployed as a Vercel serverless function; it uses Drizzle ORM over Neon PostgreSQL (HTTP driver) and Clerk for JWT auth. `apps/web` is a React 19 / Vite SPA deployed on Cloudflare Pages; it talks to the API via `src/lib/api.ts` with Bearer tokens from Clerk's React SDK. All data is multi-tenant: every DB row has a `userId` column scoped to the Clerk user.

## Key Files

| File | Purpose |
|---|---|
| `apps/api/api/index.ts` | Vercel serverless entry point. Manually buffers the POST body before calling `app.fetch`. Do not replace with `getRequestListener` — it breaks on Vercel. |
| `apps/api/src/index.ts` | Hono app: CORS → clerkMiddleware → routes. |
| `apps/api/src/middleware/auth.ts` | Singleton `ClerkClient` (module-level). Never call `createClerkClient()` inside the middleware handler — it re-fetches JWKS on every request and causes timeouts. |
| `apps/api/src/db/index.ts` | Drizzle + neon-http setup. Uses `drizzle-orm/neon-http` — no transactions. |
| `apps/api/src/db/schema.ts` | All table definitions. Edit here, then `pnpm db:generate` + `pnpm db:migrate`. |
| `apps/api/src/routes/contacts.ts` | `sanitize()` strips client-supplied readonly fields. `withCategories()` does a manual batch join to avoid N+1. |
| `apps/api/vercel.json` | `installCommand` navigates to repo root so the root `pnpm-lock.yaml` is used. Do not remove. |
| `apps/web/src/lib/api.ts` | Single source of truth for all HTTP calls. `BASE` strips trailing slash from `VITE_API_URL`. |
| `apps/web/src/types.ts` | Shared TypeScript types mirroring DB schema. |
| `.vercel/repo.json` | Points Vercel CLI (from repo root) at `relationships-api` in `apps/api`. Required for `vercel --prod` from root. |

## Hard-Won Lessons

### 1. Vercel body streaming is broken with `getRequestListener`
Vercel buffers the full request body before the handler is invoked. Node.js `data`/`end` events on `IncomingMessage` never fire after the fact, so `@hono/node-server`'s `getRequestListener` produces a `ReadableStream` that never delivers data. Every POST/PUT/PATCH that calls `c.req.json()` will hang until the 30-second timeout.

**Fix:** `api/index.ts` manually reads the body with `readBody(req)` (attaches listeners before Vercel touches it via event queueing), then constructs a `new Request(url, { body: buf.toString() })`.

### 2. Clerk JWKS must be cached — never create a client per-request
`@hono/clerk-auth`'s default `clerkMiddleware()` calls `createClerkClient()` on every request, which performs a fresh JWKS fetch every time. This adds 200–500ms per request and can cause cold-start timeouts.

**Fix:** `src/middleware/auth.ts` creates one `ClerkClient` at module level. It is reused across all requests within a warm function instance.

### 3. Deploy from repo root, not from `apps/api`
Vercel project has Root Directory = `apps/api` in the dashboard. Running `vercel --prod` from inside `apps/api` causes path doubling (`apps/api/apps/api`). Always deploy from the repo root — `.vercel/repo.json` at root points to the correct project.

### 4. pnpm lock file must come from repo root
Vercel auto-deploy runs `pnpm install` from inside `apps/api`. Without the `installCommand` override, it can't find the root `pnpm-lock.yaml` and resolves packages independently, potentially installing different versions (which caused intermittent 504s). The `installCommand: "cd ../.. && pnpm install --frozen-lockfile"` in `vercel.json` fixes this.

### 5. neon-http has no transactions
Switched from `neon-serverless` (WebSocket Pool) to `neon-http` to fix connection hanging in Vercel's serverless environment. The HTTP driver does not support `db.transaction()`. Use sequential awaited queries instead.

## Common Tasks

### Add a new API route
1. Create `apps/api/src/routes/yourroute.ts` with a `new Hono()` app.
2. Register it in `apps/api/src/index.ts`: `app.route("/api/yourroute", yourRoute)`.
3. Add the typed client method in `apps/web/src/lib/api.ts`.
4. Add the TypeScript type to `apps/web/src/types.ts` if needed.

### Add a DB column
1. Edit `apps/api/src/db/schema.ts`.
2. Run `pnpm db:generate` (from repo root) to create the migration SQL.
3. Run `pnpm db:migrate` to apply it.
4. Update `sanitize()` in `contacts.ts` if the new field should be writable by clients.

### Deploy after changes
```bash
# From repo root:
vercel --prod --yes
git add -A && git commit -m "..." && git push origin main
```
GitHub push also triggers Vercel auto-deploy.

## Environment Variables

### API (`apps/api/.env` / Vercel)
| Var | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk backend secret (`sk_test_...`) |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_test_...`) |
| `WEB_ORIGIN` | Allowed CORS origin(s), comma-separated |

### Web (`apps/web/.env` / Cloudflare Pages)
| Var | Description |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Same publishable key as API |
| `VITE_API_URL` | Full API base URL (no trailing slash) |

## Clerk Notes

- Currently using a **Development** instance (shows "Development mode" badge in UI). This is intentional — a custom domain is required for a Production instance, which is not available on `*.pages.dev`.
- Auth tokens are short-lived (≤60s). The frontend's `useAuth().getToken()` auto-refreshes before expiry.
- `getAuth(c)` in route handlers returns `{ userId, sessionId, sessionClaims, ... }`. Only `userId` is needed for most queries.
