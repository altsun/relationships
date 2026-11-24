# Relationship Manager

A privacy-focused personal CRM — track relationships, birthdays, categories, and notes. Source code and a hosted instance's private contact data are separate. Self-hosting requires your own authentication and database configuration.

## Stack

| Layer | Tech |
|---|---|
| API | Hono.js + Drizzle ORM + Neon (PostgreSQL) |
| Web | React 19 + Vite + Tailwind CSS v4 |
| Auth | Clerk (JWT, Development instance) |
| Deploy | API → Vercel Functions · Web → Cloudflare Pages |

## Project Structure

```
relationships/
├── apps/
│   ├── api/          # Hono API (Vercel serverless)
│   │   ├── api/index.ts        # Vercel entry point
│   │   ├── src/
│   │   │   ├── index.ts        # App + middleware wiring
│   │   │   ├── routes/         # contacts, categories, birthdays
│   │   │   ├── middleware/auth.ts
│   │   │   └── db/             # Drizzle schema + migrations
│   │   └── vercel.json
│   └── web/          # React SPA (Cloudflare Pages)
│       └── src/
│           ├── pages/          # ContactsPage, BirthdaysPage, CategoriesPage, …
│           ├── components/     # Layout, ContactForm, CategoryBadge, …
│           ├── lib/api.ts      # Typed API client
│           └── types.ts
├── pnpm-workspace.yaml
└── pnpm-lock.yaml   # root lock file — used by both apps
```

## Local Development

### Prerequisites

- Node.js 24 and pnpm 11.25.0 (matching CI)

### Setup

```bash
pnpm install           # installs all workspaces from root lock file
```

Create `apps/api/.env`:
```
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
WEB_ORIGIN=http://localhost:5173
```

Create `apps/web/.env`:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3000
```

### Run

```bash
pnpm dev:api    # API on http://localhost:3000
pnpm dev:web    # Web on http://localhost:5173
```

### Database

```bash
pnpm db:generate   # generate SQL migration from schema changes
pnpm db:migrate    # apply migrations to Neon
pnpm db:studio     # open Drizzle Studio (browser UI)
```

## Deployment

### API — Vercel

**Manual deploy** (from repo root):
```bash
vercel --prod --yes
```

**GitHub auto-deploy** is configured via Root Directory = `apps/api` in the Vercel dashboard.  
`vercel.json` sets `installCommand` to `cd ../.. && pnpm install --frozen-lockfile` so the root lock file is used.

Required Vercel env vars: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `WEB_ORIGIN`.

### Web — Cloudflare Pages

Build command: `pnpm build:web`  
Output directory: `apps/web/dist`  
Root directory: `apps/web` (or set install command to `cd ../.. && pnpm install --frozen-lockfile`)

Required Pages env vars: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL`.

## API Routes

All `/api/*` routes require `Authorization: Bearer <clerk-token>`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/contacts` | List contacts (`?search=`, `?sort=`, `?categoryId=`) |
| POST | `/api/contacts` | Create contact |
| GET | `/api/contacts/:id` | Get contact |
| PUT | `/api/contacts/:id` | Update contact |
| DELETE | `/api/contacts/:id` | Delete contact |
| PATCH | `/api/contacts/:id/archive` | Archive |
| PATCH | `/api/contacts/:id/unarchive` | Unarchive |
| GET | `/api/contacts/archived` | List archived |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| PATCH | `/api/categories/reorder` | Bulk update sortIndex |
| DELETE | `/api/categories/:id` | Delete (`?force=true` to unlink contacts) |
| GET | `/api/birthdays/upcoming` | Birthdays within 30 days |

## Known Gotchas

- **Vercel body buffering**: Vercel pre-buffers the Node.js `IncomingMessage` body before the handler runs. `getRequestListener` from `@hono/node-server` relies on streaming events that never fire. `api/index.ts` uses a custom `readBody()` to buffer upfront before constructing the Web API `Request`.
- **Clerk JWKS caching**: `clerkMiddleware()` creates a singleton `ClerkClient` at module load so JWKS is cached across warm requests. Do not recreate the client per-request.
- **pnpm lock file**: Always install from repo root (`pnpm install`) so all workspaces use the same lock file. Installing inside `apps/api` alone can resolve different versions.
- **neon-http**: Uses `drizzle-orm/neon-http` (HTTP-based, no WebSocket). Transactions are not supported — use sequential queries instead.

## Security and privacy

Keep all credentials in environment variables and never commit real contact data. The API requires authentication, scopes account data by the authenticated user, and does not cache personal API responses. Set `WEB_ORIGIN` explicitly for each deployment; configure shared rate limiting on the API edge and isolate production from development/preview databases and Clerk instances. These controls do not replace a deployment security review.

Report vulnerabilities privately: [Security policy](SECURITY.md). Before publishing or deploying this project, review the [open-source release gate](docs/open-source-readiness.md).

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). This project is licensed under [GNU AGPL-3.0-only](LICENSE).
