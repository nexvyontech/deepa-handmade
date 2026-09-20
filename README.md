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