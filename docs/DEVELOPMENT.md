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

Catalogue (Phase 5), public and admin:

| Method & path                                          | Auth        | Notes                                    |
| ------------------------------------------------------ | ----------- | ---------------------------------------- |
| `GET  /catalog/categories`                             | public      | 200, active categories flat list         |
| `GET  /catalog/categories/:slug`                       | public      | 200/404                                  |
| `POST /admin/categories`                               | perm `category.create` | 201          |
| `GET  /admin/categories`                               | perm `category.read`   | 200 (incl. inactive) |
| `GET  /admin/categories/:id`                           | perm `category.read`   | 200        |
| `PATCH /admin/categories/:id`                          | perm `category.update` | 200        |
| `DELETE /admin/categories/:id`                         | perm `category.delete` | 200, soft deactivate |
| `GET  /catalog/products`                               | public      | 200 `{items,page,limit,total,totalPages}`, filters `q`, `category`, `color`, `size`, `handle`, `priceMin/Max`, `featured`, `sort`, `page`, `limit` |
| `GET  /catalog/products/:slug`                         | public      | 200/404, pricing range + `media` + `variants` |
| `GET  /catalog/products/:slug/variants`                | public      | 200, full variant views                    |
| `GET  /admin/products`                                 | perm `product.read`    | 200 (admin filters incl. status)    |
| `POST /admin/products`                                 | perm `product.create`  | 201, default `DRAFT`               |
| `GET  /admin/products/:id`                             | perm `product.read`    | 200 (includes hidden media)         |
| `PATCH /admin/products/:id`                            | perm `product.update`  | 200                                   |
| `DELETE /admin/products/:id`                           | perm `product.delete`  | 200, soft `ARCHIVED`                  |
| `GET  /admin/products/:id/media`                       | perm `product.read`    | 200, media of the product            |
| `PUT  /admin/products/:id/media`                       | perm `product.update`  | 200, reorders the exact AVAILABLE set  |
| `DELETE /admin/products/:id/media/:mediaId`            | perm `product.update`  | 200, detaches (hides) an image       |
| `PATCH /admin/pricing/products/:productId`             | perm `price.update`    | 200, only entry point for price fields + audit `PRICE_CHANGED` |
| `POST /admin/options` / `PATCH|DELETE /admin/options/:id` | perm `variant.*`    | option values (COLOR/SIZE/HANDLE)      |
| `POST /admin/variants` / `PATCH|DELETE /admin/variants/:id`, `GET /admin/variants` | perm `variant.*` | variants, unique `comboHash`, auto SKU |

CMS & SEO (Phase 5):

| Method & path                                  | Auth            | Notes                                    |
| ---------------------------------------------- | --------------- | ---------------------------------------- |
| `GET  /cms/pages`                              | public          | 200, published pages only                |
| `GET  /cms/pages/:slug`                        | public          | 200/404                                  |
| `GET  /cms/banners`                            | public          | 200, active + in date window             |
| `GET  /admin/cms/pages`                        | perm `cms.read` | 200, all statuses                        |
| `POST /admin/cms/pages`                        | perm `cms.create` | 201, `DRAFT` page                      |
| `PATCH /admin/cms/pages/:id` / `PATCH .../status` `{action: publish\|unpublish\|archive}` | perm `cms.update`/`cms.publish` | 200 |
| `DELETE /admin/cms/pages/:id`                  | perm `cms.delete` | 200, soft `ARCHIVED`                    |
| `GET  /admin/banners` / `POST /admin/banners` / `PATCH|DELETE /admin/banners/:id` | perm `cms.*` | banner lifecycle, soft deactivate |
| `GET  /admin/seo/:entityType/:entityId`        | perm `seo.read`   | `entityType` ∈ product\|category\|page  |
| `PUT  /admin/seo/:entityType/:entityId`        | perm `seo.update` | 200, writes the entity SEO block       |
| `POST /media/upload`                           | perm `media.upload` | 201, multipart `file` + `ownerType`/`ownerId` |
| `GET  /media` (filters) / `GET  /media/:id`    | perm `media.read` | 200                                        |
| `GET  /media/:id/content`                      | public*         | streams/redirects; private bucket requires `media.read` |
| `PATCH /media/:id`                             | perm `media.update` | 200                                      |
| `DELETE /media/:id`                            | perm `media.delete` | 204, hard delete (blocked while referenced) |

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

## Catalogue, CMS, media & SEO (Phase 5)

- Playbooks are `docs/PHASE5_CATALOGUE_CMS.md` and `docs/PHASE2_DATABASE_DESIGN.md`
  (guards, list/pagination shapes, slug rules). Highlights:
- **Product soft-delete**: `DELETE /admin/products/:id` flips status to
  `ARCHIVED` (never blocks; ghosts disappear from every public list). The same
  `ARCHIVED` status is used for CMS pages and banners.
- **Pricing governance**: product `basePrice`/`mrp`/`moq` are only writable via
  `PATCH /admin/pricing/products/:productId` (guard `price.update`), which can
  also set a variant `priceDelta` and writes an `EARNEST_MONEY`-style
  `PRICE_CHANGED` audit entry. Variant DTOs never contain price fields.
- **Variants**: a variant is a unique `{optionValueIds}` combination under a
  product — uniqueness via a `comboHash` (SHA-1 of ordered value ids), SKU is
  auto-generated from the product SKU stem, and SKUs/price deltas are unique per
  product.
- **Search & filter** (`GET /catalog/products`): `q` runs an escaped,
  case-insensitive regex over each localized `searchText`; `category` filters by
  descendant expansion (`category.ancestorIds`); allow-listed sorts are
  `featured-desc` (default), `price-asc`, `price-desc`, `newest-desc`,
  `name-asc`.
- **Localized slugs & SEO**: every product/category/page stores an SEO block
  (`title`, `metaDescription`, `keywords`, `canonicalUrl`, `ogImageMediaId`,
  `robotsNoIndex`) written through `PUT /admin/seo/:entityType/:entityId`; slugs
  are per-locale (`slug.en`, `slug.ta`) with uniqueness enforced by versioned
  `*_slug_key` lookup schemas.
- **Media**: files validated by magic-byte sniffing (JPEG/PNG/WebP/GIF ≤ 5 MB,
  capacity warnings at 80%/100%), stored in a pluggable
  `StorageDriver` (`LocalStorageDriver` local, `AwsS3Driver` behind
  `S3_ENABLED=1`), uploaded as multipart with `ownerType` (product/category/
  page/banner/user). Harmless ID `ORDER` guard prevents unauthenticated
  enumeration; content is streamed/redirected with cache headers.
- **Boot modes**: every Phase 5 module registers its Mongoose models only when
  `MONGODB_URI` is set; without a database the public routes answer 503
  `SERVICE_UNAVAILABLE`. Media upload also 503s when `storage.baseDir` is not
  configured. Media `PATCH`/`order`/`content` deliberately take **any** valid id
  (no per-resource ownership check) because media is currently untyped — see the
  Phase 5 playbook's open questions.

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
  bounded context. `auth` (Phase 4) and `catalogue`/`categories`/`products`/
  `variants`/`pricing`/`cms`/`media`/`seo`/`health`/`app` are implemented
  (Phases 4–5); the rest remain stubs and are wired into `AppModule` when their
  phase lands.

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