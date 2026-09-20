# Development setup

## Prerequisites

- Node.js >= 22 (recommended: 24 LTS) and npm
- MongoDB for the API database:
  - recommended: **Docker Desktop** (or Docker Engine + Compose v2), or
  - a MongoDB Atlas M0 free cluster for `MONGODB_URI`

## First-time setup

```bash
npm install
```

This installs all workspaces (`apps/web`, `apps/api`, `packages/shared`) with a
single lockfile.

## Local MongoDB with Docker

The repository ships a Docker Compose file for a local MongoDB, isolated on its
own network with a persistent named volume (`docker compose down` keeps your
data; only `npm run infra:reset` wipes it).

```bash
cp infra/docker/.env.example infra/docker/.env
npm run infra:up        # start MongoDB, wait until healthy
npm run infra:status    # container + health status
npm run infra:logs      # tail container logs (Ctrl-C to stop)
npm run infra:down      # stop (data preserved)
npm run infra:reset     # WARNING: stops AND deletes the data volume
```

Default local connection string (keep `apps/api/.env` in sync with
`infra/docker/.env` if you change the credentials):

```
mongodb://deepa:deepa_pass@localhost:27017/deepa?authSource=admin
```

## Environment variables

Copy the example files to your own `.env` files. Real values are committed to
neither `.env` nor `.env.local`.

- API: `apps/api/.env.example` → `apps/api/.env`
- Web: `apps/web/.env.example` → `apps/web/.env.local`

Set `MONGODB_URI` to the local Docker URI above (or your Atlas URI). The API
also runs without a database — with `MONGODB_URI` empty the health endpoint
reports `database.mode: "not_configured"` and no Mongoose connection is made,
which is useful for tests and the build.

## Running locally

| Command                  | What it does                                     |
| ------------------------ | ------------------------------------------------ |
| `npm run dev:web`        | Next.js dev server on port 3000                  |
| `npm run dev:api`        | NestJS dev server (watch) on port 3001           |
| `npm run dev`            | Both web and API in parallel (independent output)|
| `npm run build`          | Build all packages                               |
| `npm run lint`           | Lint all workspaces                              |
| `npm run typecheck`      | Type-check all workspaces                        |
| `npm test`               | Run unit tests                                    |
| `npm run test:ci`        | CI-style test run (coverage)                    |

Typical day: start MongoDB first (`npm run infra:up`), then `npm run dev:api`
and `npm run dev:web`.

## Health & verifying DB connectivity

`GET /api/v1/health` reports:

- `database.state: "connected"` + `status: "up"` when MongoDB is reachable,
- `database.state: "disconnected"`/`"connecting"` + `status: "down"` when it is
  not, and
- `database.mode: "not_configured"` when `MONGODB_URI` is empty.

The endpoint never exposes the URI, credentials or database name.

## API endpoints

- `GET /api/v1/health` — health check (heap, disk, database connectivity)
- `GET /api/v1/info` — API metadata
- `GET /api/docs` — Swagger UI

The API uses URI versioning under a global `api` prefix; new major versions
would use `/api/v2/...`.

## HTTP, errors, request ids & logging

- **Request id**: every request gets a correlation id. It is read from the
  `X-Request-Id` header (configurable via `REQUEST_ID_HEADER`) or generated, and
  is echoed in the `X-Request-Id` response header, filtered into error bodies,
  and attached to log lines. Middleware order: `RequestIdMiddleware` runs before
  `RateLimitMiddleware`.
- **Error contract**: failures use a consistent body —
  `{ statusCode, code, message, details?, requestId, path, timestamp }`. `code`
  values live in `apps/api/src/common/errors/error-codes.ts`. Throw
  `ApiException.*` factories (or `ValidationException`) from features; the global
  `AllExceptionsFilter` also normalizes `HttpException`s and unknown errors. In
  `production` internal messages and stack traces are never sent to clients.
- **Validation**: a global typed `ValidationPipe` (whitelist, forbid unknown
  values) returns 422 `ValidationException`s with per-field `details`.
  `ParseObjectIdPipe` validates 24-hex Mongo ids on route params.
- **Logging**: `StructuredLogger` emits `[Service] message key=value` in dev and
  one JSON object per line in production (`LOG_FORMAT=json`). Sensitive values
  are redacted; stacks are dev-only.
- **Security**: global helmet + CORS from `CORS_ORIGINS`; in-app rate limiting
  (in-memory, no Redis) returning standard 429s with `Retry-After`, bypassed for
  `/health` and `/api/docs`. `AuthGuard`/`RolesGuard`/`PermissionsGuard` and the
  `@Public()`/`@Roles()`/`@Permissions()` decorators are scaffolded but auth is
  not yet wired in Phase 4.
- **Business modules**: `apps/api/src/modules/*` contains one Nest module stub
  per bounded context (auth … audit). They are registered-able, but none are
  wired into `AppModule` until their phase.

## Local vs production

The application code is identical in both environments — only environment
values change:

| Concern       | Local                  | Production            |
| ------------- | ---------------------- | --------------------- |
| Database      | Docker `mongodb:8.0`   | MongoDB Atlas (M0 sandbox → paid tier) |
| `MONGODB_URI` | `localhost:27017`      | `mongodb+srv://...`   |
| Secrets       | your local `.env`      | Render dashboard / CI secrets |

## Troubleshooting

- `docker: command not found` — install/start Docker Desktop and ensure the
  CLI is on `PATH`, then retry `npm run infra:up`.
- Connection refused on `localhost:27017` — check `npm run infra:status`; the
  container must be `healthy` before the API connects.
- Auth failure — the `apps/api/.env` `MONGODB_URI` user/password must match
  `infra/docker/.env`; keep `authSource=admin` and a root user +
  `db@27017` pair consistent.
- Port clash on 27017 — change `MONGO_PORT` in `infra/docker/.env` and update
  the URI accordingly.
- Want a clean slate — `npm run infra:reset` (destroys the volume).

## Conventions

- Canonical order/payment/production/QC/packing/shipping/return/refund states
  and permission codes live in `packages/shared` — import from there, never
  redefine literals.
- Database design is documented in `docs/PHASE2_DATABASE_DESIGN.md`; Mongoose
  schemas under `apps/api/src/database/schemas/` mirror it one-to-one.
- Frontend/backend split: customer storefront routes under `app/(customer)`,
  admin under `app/(admin)`.
- No payment gateway. Payment methods are `UPI_MANUAL` and `COD`; UPI proof is
  never auto-confirmed.