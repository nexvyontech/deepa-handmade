# Phase 5 — Catalogue, CMS, media & SEO

Playbook for the Phase 5 build: the browsable product catalogue (categories,
products, options, variants, pricing) plus content management (CMS pages,
banners), media storage and per-entity SEO. Success criteria for the phase: all
guards/audits behave, list endpoints paginate, DTOs forbid unknown fields, ids
are validated, everything degrades gracefully without a database, and the whole
suite is green (typecheck, lint, unit, e2e, build, live boot).

## Scope & modules

Implemented in `apps/api/src/modules/`:

| Module      | Delivers |
| ----------- | -------- |
| `categories` | Hierarchical categories, per-locale slugs, descendant-aware listing |
| `products`   | Localized product documents, public/admin reads, soft delete |
| `variants`   | Option values + variants with combo-hash dedupe and auto SKUs |
| `pricing`    | Sole write path for price fields, `price.update` guard, audit |
| `cms`        | Pages with publish workflow + banners with date window |
| `media`      | Multipart upload, magic-byte validation, pluggable storage, ordering |
| `seo`        | Read/write of `title`, `metaDescription`, `keywords`, `canonicalUrl`, `ogImageMediaId`, `robotsNoIndex` for product/category/page |

Route map (auth guards, request/response shapes) is in
`docs/DEVELOPMENT.md` → **API endpoints**. Swagger (`/api/docs`) documents every
endpoint; DTOs use `whitelist` + `forbidNonWhitelisted` globally.

## Key decisions & rationale

- **Soft deletes, never hard.** `DELETE` transitions to `ARCHIVED` for products,
  pages and banners, and to `inactive` for categories. Nothing is physically
  removed from admin lists, so history/audits survive and no referential cleanup
  is needed; public/active views filter these out. Media `DELETE` is the one hard
  delete (and is 409-blocked while referenced).
- **Pricing is a read-model governed by `pricing`.** `basePrice`/`mrp`/`moq`
  appear in product DTOs but are only writable through
  `PATCH /admin/pricing/products/:productId` (guard `price.update`). Variant DTOs
  expose `priceDelta` read-only; a 400 rejects any attempt to set price fields on
  product/variant create or update. Every successful pricing write audits
  `PRICE_CHANGED` with fields/before/after.
- **Variant uniqueness by semantics, not by hand.** A variant is a unique set of
  `optionValueIds` under one product; a deterministic `comboHash` (SHA-1 of the
  value ids in a fixed order) plus a `{productId, comboHash}` unique index
  rejects duplicates with 409. SKUs are generated from the product SKU stem with
  a short disambiguating suffix, and `{productId, sku}` is unique per product.
- **Slugs are per-locale and versioned.** `slug.en`/`slug.ta` are looked up
  through `*_slug_key` collections so a rename can never create a dangling or
  colliding public URL; duplicates increment a `-2` style suffix committed to the
  slug key.
- **Category filter expands to descendants.** `GET /catalog/products?category=`
  matches the slug or id and filters by the subtree using
  `categoryId ∈ {selfId} ∪ ancestor.ids of matching products` so children inherit
  listings without joins.
- **Search is escaped regex over `searchText`.** `q` is trimmed, regex-escaped
  (including the `%` character), case-insensitive, and matches any of the
  localized `searchText` fields (name + description blend). Sort is allow-listed
  (`featured-desc` default, `price-asc/desc`, `newest-desc`, `name-asc`) — unseen
  values fall back to the default.
- **Guard-less "harmless id" reads.** `GET /media/:id/content` and media
  `PATCH`/`order` deliberately accept any valid 24-hex id without an ownership
  check while media remains untyped. This is a known gap, tracked under **Open
  questions**.
- **All modules boot without a database.** When `MONGODB_URI` is empty each Phase
  5 module registers only its models' mongoose-less shell and public routes answer
  503 `SERVICE_UNAVAILABLE` (verified live). Upload additionally 503s when no
  storage `baseDir` is configured.

## Mongoose pitfall fixed this phase

Spreading a schema that declares `required: true` leaves (e.g.
`{ type: { en: { required: true, ... } } }`) marks the **owning** path required
too. Building `materialText` as `{ ...localizedText }` therefore made
`product.materialText` implicitly required and omitted documents failed with
"Validation failed: materialText.en: Path `materialText.en` is required". Fix:
`optionalLocalizedText` in `apps/api/src/database/schemas/common.ts` —
`{ type: { ...localizedText }, required: false, default: undefined }` — used for
`product.materialText`, `media.alt`, `banner.title/ctaLabel`, `cms-page.content`.

## Media pipeline

1. Multipart upload `POST /media/upload` (`file` + `ownerType`/`ownerId`) with
   `media.upload`; size capped `MEDIA_MAX_VIDEO_MB` (default 100).
2. Magic-byte sniffing (JPEG/PNG/WebP/GIF; static images ≤ 5 MB) — declared
   extension never trusted; uppercase extensions across the storage adapter are
   normalized to lowercase.
3. `StorageDriver` interface stores bytes and returns a storage ref; S3 is behind
   `S3_ENABLED=1` (`AwsS3Driver`), otherwise `LocalStorageDriver`.
4. `POST /media/order` reorders the exact AVAILABLE set (membership + 409 for
   referrals); product media order is the primary sort for catalogue views.
5. `GET /media/:id/content` streams from the driver or 302s to a short-lived S3
   Presigned URL with cache headers.

## Test strategy & results

- **Unit** (`*.test.ts`, run via `node scripts/run-jest.mjs` from `apps/api`):
  media magic-byte/size validation (correct sniff for each format, capacity
  warnings, oversized → 413), local storage driver, product query service
  (search escaping, sort allow-list, filtering), guards, etc. — **117 tests, 23
  suites, all passing**.
- **E2e** (`apps/api/test/*.e2e-spec.ts`, `npm run test:e2e`, needs Docker Mongo):
  seed via `createTestApp()` with SUPER_ADMIN roles
  (`[...ALL_PERMISSIONS]`), argon2 staff user, supertest. Catalogue spec covers
  category CRUD + descendant listing, product create/read/update, variant +
  options lifecycle, pricing governance (400 on non-pricing price writes,
  `PRICE_CHANGED` audit, variant `priceDelta`), SEO write/read, soft delete.
  Media/CMS spec covers upload validation/order/content/RBAC, page publish
  lifecycle, banner date windows — **4 suites, 56 tests, all passing**.
- **Idempotency**: e2e runs against a persistent dev Mongo volume, so every spec
  stamps slugs/SKUs/names with `Date.now().toString(36) + seq` and only asserts
  on values it creates itself.
- **Live smoke** (fresh `dist`, correct `apps/api` CWD so `.env` loads):
  `/api/v1/info`, `/api/v1/health` (DB connected), `/api/v1/catalog/products`,
  `/api/v1/catalog/categories`, `/api/v1/cms/banners`, `/api/v1/cms/pages` all
  200, `/api/docs` serves Swagger UI. No-DB boot (wrong CWD → no `.env`) returns
  the intended 503s.

## Open questions

- **Media ownership**: media documents are untyped and unowned; id-safe endpoints
  accept any valid id. Add `ownerType/ownerId` integrity + ownership checks when
  media slots get fully typed.
- **Refresh-side auth on media**: content streaming is `@Public()` for local
  buckets; S3/cloudfront private buckets will need signed, time-boxed URLs with a
  `media.read` check.
- **Reservations/griefing on SKU stems and slug key collisions** are handled by
  uniqueness + suffixing; consider explicit `409` messaging for combo-aware
  variant writes once the admin UX is built.