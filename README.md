# Deepa Handmade

E-commerce platform for handcrafted wire kudai (baskets) made in Tamil Nadu.
Browse, order, pay via UPI (manual screenshot verification) or COD, and track
orders through an admin dashboard covering production, QC, packing, shipping,
returns and refunds.

## Repo layout

| Path                | What it is                                    |
| ------------------- | --------------------------------------------- |
| `apps/web/`         | Next.js storefront + admin dashboard (App Router, React 19, Tailwind 4) |
| `apps/api/`         | NestJS REST API (modular monolith, Swagger)   |
| `packages/shared/`  | Shared constants — canonical D3 state enums, permission codes, roles |
| `infra/`            | Deployment notes / provider-adapter reference |
| `docs/`             | BRD, FRD, Phase 0 technical plan              |
| `.github/workflows/`| CI pipeline                                   |

## Quick start

Requires Node.js >= 22 and npm.

```bash
npm install
npm run dev:web   # storefront on http://localhost:3000
npm run dev:api   # API on http://localhost:3001 (Swagger at /api/docs)
```

See `docs/DEVELOPMENT.md` for environment variables and setup details, and
`docs/DEPLOYMENT.md` for production deployment.

## Project status

Phase 1 (repository + architecture foundation) is complete: monorepo all set
up, CI wired, no business modules yet. See `docs/PHASE0_TECHNICAL_PLAN.md` for
the phased plan.

Phase 2 is complete: full MongoDB database design
(`docs/PHASE2_DATABASE_DESIGN.md` + Mongoose schemas in `apps/api/src/database/schemas/`)
and local Docker infrastructure (`infra/docker/`, `npm run infra:*`).

Phase 3 is complete: API foundation — global `api/v1` prefix, health/info,
typed error contract with request ids, structured logging, helmet/CORS, in-app
rate limiting, and a uniform Mongoose boot mode that also runs without a
database.

Phase 4 is complete: full authentication — argon2id passwords, stateless JWT
access tokens, rotating refresh tokens with reuse detection and audit trails,
lockout, staff CRUD permissions, and role/permission guards.

Phase 5 is complete: catalogue, CMS, media and SEO — categories (hierarchical,
slugged), products with localized fields and media ordering, option values and
variants (combo-hash dedupe, auto SKUs), a pricing governance layer with audit,
CMS pages and banners with a publish workflow, S3-ready pluggable media storage
with format sniffing, and per-entity SEO blocks. Verified set: lint/typecheck
clean, 117 unit tests, 56 e2e tests, and a full build.
See `docs/PHASE5_CATALOGUE_CMS.md` for the playbook.