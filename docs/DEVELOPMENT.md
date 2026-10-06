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

Auth (Phase 4) also needs `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — give
them long random values in `apps/api/.env`. With them empty the API still
boots, but token issuance/verification fails with 503; production refuses to
start without them (`config/env.validation.ts`).

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

Authentication (Phase 4), all JSON under `/api/v1/auth`:

| Method & path                      | Auth                | Notes                                     |
| ---------------------------------- | ------------------- | ----------------------------------------- |
| `POST /auth/register`              | public              | 201, creates an `ACTIVE` CUSTOMER + tokens |
| `POST /auth/login`                 | public              | 200 `{accessToken, expiresIn, refreshToken, user}` |
| `POST /auth/refresh`               | public (body token) | 200, rotates the refresh session          |
| `POST /auth/logout`                | access token        | 204, revokes the presented session        |
| `POST /auth/logout-all`            | access token        | 204, revokes every session for the user   |
| `GET  /auth/me`                    | access token        | 200, fresh profile from the database      |
| `POST /auth/change-password`       | access token        | 204, revokes all sessions                 |
| `POST /auth/password-reset/request`| public              | 202, always generic; `resetToken` echoed outside production |
| `POST /auth/password-reset/confirm`| public              | 204, single-use token, revokes sessions   |
| `GET  /auth/sessions`              | access token        | 200, the caller's refresh sessions        |
| `POST /auth/admin/users/:userId/revoke-sessions` | roles guard (`SUPER_ADMIN`, `ADMIN`) | 204 |
| `GET  /auth/admin/users/:userId/sessions`        | permissions guard (`staff.manage`)    | 200 |

The API uses URI versioning under a global `api` prefix; new major versions
would use `/api/v2/...`.

## Authentication (Phase 4)

- **Access tokens** are stateless JWTs (`sub`, `role`, `permissions`,
  `sessionId`, `iat`, `exp`) signed with `JWT_ACCESS_SECRET` (default TTL 15m).
  `AuthGuard` verifies them on every non-`@Public()` route and attaches
  `request.user = { id, role, roles, permissions, sessionId }` — there is **no
  per-request database read**, so a suspension/role change only takes effect at
  the next token issuance (bounded by the 15-minute TTL). `AuthGuard` runs
  first, then `RolesGuard`, then `PermissionsGuard` (all `APP_GUARD`, order
  matters).
- **Refresh tokens** are opaque 256-bit random values passed in a JSON body
  (`{refreshToken}`), stored only as SHA-256 hashes in `user-refresh-tokens`.
  Every refresh rotates the token; replaying a rotated token triggers **reuse
  detection**: the whole lineage (walked via `replacedByRef`) is revoked, the
  attempt is audited (`TOKEN_REUSE_DETECTED`) and answered with 401.
- **Lockout**: five consecutive bad passwords set `lockedUntil` (+15 minutes);
  while locked every login answers 429 `RATE_LIMITED`. Unknown users and bad
  passwords share the same 401 `Invalid credentials` response (no user
  enumeration), as do password-reset requests (always 202).
- **Passwords** use argon2id (64 MiB, t=3, p=1; `PasswordHasherService`).
  A password change or reset revokes all refresh sessions and clears the
  lockout; `passwordChangedAt` is stamped.
- **Audit**: authentication events are written to `audit-logs` best-effort
  (`USER_REGISTERED`, `USER_LOGIN_SUCCEEDED`, `USER_LOGIN_FAILED`,
  `USER_LOGOUT`, `USER_LOGOUT_ALL`, `USER_PASSWORD_CHANGED`,
  `USER_PASSWORD_RESET_*`, `USER_SESSION_REVOKED`, `TOKEN_REUSE_DETECTED`,
  `ACCOUNT_LOCKED` — an additive extension of the Phase 2 `AUDIT_ACTIONS`
  enum). Entries are only persisted when the user entity exists; failures never
  break the auth flow.
- **Boot modes**: `AuthModule` registers its Mongoose models only when
  `MONGODB_URI` is set (mirrors `DatabaseModule`); without a database every
  auth workflow fails fast with 503 `SERVICE_UNAVAILABLE`. A missing
  `JWT_ACCESS_SECRET` also fails with 503 (production enforces both via
  `env.validation.ts`).

### Decisions & open questions

- Refresh tokens travel in a **JSON body, not a cookie** (no cookie-parser
  dependency; the SPA/mobile clients hold the token). *Open:* switch to
  `HttpOnly; Secure; SameSite=strict` cookies if the web client is same-site.
- `password-reset/request` echoes `resetToken` in the response **only when
  `NODE_ENV !== 'production'`** so local flows complete without a delivery
  channel. *Open:* wire email/SMS/WhatsApp delivery and drop the echo.
- Access tokens are **not revoked mid-lifetime** (stateless guard); the 15m TTL
  bounds exposure. *Open:* short-lived tokens + a revocation check if instant
  logout-everywhere is required.
- `AUDIT_ACTIONS` in `database/schemas/audit-log.ts` was extended additively for
  the auth events above.

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
  `/health` and `/api/docs`. `AuthGuard`/`RolesGuard`/`PermissionsGuard` are
  registered as global `APP_GUARD`s with `@Public()`/`@Roles()`/
  `@Permissions()` (see **Authentication** below).
- **Business modules**: `apps/api/src/modules/*` contains one Nest module per
  bounded context. `auth` is implemented (Phase 4); the rest remain stubs and
  are wired into `AppModule` when their phase lands.

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