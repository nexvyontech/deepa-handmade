# Production deployment (free-tier)

Phase 1 ships no live environment. This file records the target architecture
(from `docs/PHASE0_TECHNICAL_PLAN.md`) and the variables each service needs so
the setup is ready to script in later phases.

## Target architecture

| Component        | Service            | Notes                                        |
| ---------------- | ------------------ | -------------------------------------------- |
| Storefront       | Cloudflare Pages   | `apps/web`, static export compatible         |
| API              | Render (web service)| `apps/api`, `npm run start:prod`            |
| Database         | MongoDB Atlas M0   | `MONGODB_URI` connection string              |
| Object storage   | Cloudflare R2      | product/order media via storage abstraction  |
| DNS / TLS        | Cloudflare         | good enough HTTPS for any free TLS          |
| CI/CD            | GitHub Actions     | `.github/workflows/ci.yml`                    |

## Environment variables per service

### API (Render)

| Variable | Example |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render-provided) |
| `CORS_ORIGINS` | `https://shop.mydomain.com` |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster0.mongodb.net/deepa` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | long random strings |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | `60` / `120` |
| `SWAGGER_PATH` | `api/docs` |

### Web (Cloudflare Pages)

| Variable | Example |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.mydomain.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://shop.mydomain.com` |

Secrets are injected by the platform; never commit real values.

## Migration to a paid tier (later)

Swap Cloudflare Pages → Vercel/Serverless or a VPS, add a dedicated MongoDB
cluster, and replace the storage abstraction with provider-native assets. The
API remains a single deployable service (modular monolith) — no infrastructure
re-architecture required.