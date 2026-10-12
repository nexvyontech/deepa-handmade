# Phase 6 — Next.js frontend (storefront & admin)

Playbook for the Phase 6 build: the customer storefront and staff admin written
in Next.js 16 + React 19 on top of the Phase 4 auth and Phase 5 catalogue/CMS
APIs. Success criteria for the phase: every route serves over the live stack,
storefront content is server-rendered with per-page SEO, admin pages render
against the real authenticated APIs, i18n (en/ta) and session refresh behave,
and the whole suite is green (typecheck, lint, unit, build, live boot).

## Stack

- **Next.js 16.3.5** (App Router), **React 19.2.8**, Tailwind 4, TypeScript.
  `next dev` is Turbopack; `next build` runs the production compiler.
- Tests: **Vitest + jsdom + Testing Library** (user-event, jest-dom). Setup in
  `apps/web/vitest.setup.ts` registers jest-dom and runs `afterEach(cleanup)`;
  `globals` are **not** enabled (import from `vitest` explicitly).
- Monorepo: `next` is hoisted to the root `node_modules`, so dev must launch
  with the absolute bin path
  `D:\ai\opencode\deepa\node_modules\next\dist\bin\next`.

## Application structure

Two entry shapes share one `app/`:

| Group | Nature |
| ----- | ------ |
| `app/(customer)/*` | **Server components** that fetch the public catalogue/CMS on each render (`force-dynamic`) and emit full SSR HTML + SEO metadata |
| `app/(admin)/admin/*` | **Client components** (shell + per-module screens) that fetch after mount with the bearer token and render loading/error/empty states |
| `app/login`, `app/not-found`, `app/providers.tsx`, layouts | Shared chrome and context |

Route map from `npm run build` (○ static, ƒ dynamic):

```
ƒ /                    ○ /_not-found        ƒ /[...slug]
○ /admin               ○ /admin/categories  ƒ /admin/products/[id]
○ /admin/cms/banners   ○ /admin/cms/pages   ○ /admin/products/new
○ /admin/media         ○ /admin/options     ○ /admin/pricing
○ /admin/products      ○ /admin/seo         ○ /admin/variants
ƒ /categories          ƒ /category/[slug]   ○ /login
ƒ /product/[slug]      ƒ /products          ƒ /search
```

The `/[...slug]` catch-all resolves **CMS pages** (`getPublicPage`), so `/about`,
`/terms`, etc. need no route files — this is why the old statically-shipped
`app/(customer)/about/page.tsx` was deleted.

## Key decisions & rationale

- **Storefront is server-rendered; admin is client-rendered.** Public routes
  fetch through `lib/api/*` in server components with `export const dynamic =
  "force-dynamic"` and build `Metadata` via `metadataFromSeo(...)` (product,
  category and CMS pages). Admin is a thin SPA per module because it needs the
  bearer token, mutates through `PATCH/POST/DELETE` + `FormData` uploads, and
  reads are not part of the public SEO surface.
- **i18n renders English server-side until hydration.** Dictionary pairs
  `en.ts`/`ta.ts` are key-identical through the `Messages` mapped type; backend
  content reaches the UI as `{ en, ta? }` and is resolved by `localizeText`.
  The locale state itself is client-side (see below).
- **Client-only localised chrome + storefront body.** Store header, language
  switcher, and any interactive widget are `"use client"` and read the locale
  from `useI18n()` after hydration; the server-emitted body stays `en`. This is
  the documented trade-off for keeping the storefront SSR without a server-side
  locale store.
- **One request layer, per-domain callers.** `lib/api/request.ts` builds URLs
  (JSON query serialisation incl. arrays), sends JSON or `FormData` bodies with
  `cache: "no-store"`, and maps failures to `ApiError` via the static factories
  `fromStatus / timeout / network`. Thin typed modules sit above it:
  `catalogue`, `auth`, `admin`, `cms`, `media`, `pricing`, `seo`, `variants`.
  Server components **must not** import `tokens.ts`/`request.ts` internals that
  touch `window` — every access is guarded with `typeof window === "undefined"`.
- **Stateless bearer + single-flight refresh.** The Phase 4 API issues no
  cookies, so the access/refresh pair lives in `localStorage`
  (`lib/api/tokens.ts`). On any 401 from an "auto" call the request layer
  rotates through `/auth/refresh` once (`refreshInFlight` deduplicates
  concurrent refreshes), then replays the call; refresh failure clears tokens
  and notifies the auth context → redirect to `/login`. `doRefresh` deliberately
  bypasses the request layer to avoid a self-referencing 401 loop.
- **Admin protection is UX-only.** `RequireStaff` renders a loading screen and
  `router.replace("/login")` for anonymous/non-staff sessions; the backend
  remains authoritative and rejects every unauthorised call, so a broken guard
  can never leak data.
- **`PAGE_LIMIT` lives in server-safe `lib/constants`.** (See "Next 16 pitfall".)
- **Loaders run in `queueMicrotask`.** Screens that fetch on mount use
  `useEffect(() => { queueMicrotask(() => void load()); }, [])` so no
  microtask-chain setters fire synchronously with render (avoids the "cannot
  update during render" path). Raw `void load()` in a `useEffect` is
  discouraged.
- **Async mutations go through `use-async-mutation`.** One hook wraps the
  pending/error/success lifecycle used by every admin screen; the shared
  `feedback` UI renders `ApiError` messages consistently (including field
  details).

## Next 16 pitfall fixed this phase

`"use client"` modules may only re-export components to be imported from server
code — **value exports become client-reference proxies that throw when called
server-side**. The listing component originally shipped `export const
PAGE_LIMIT = 20;`, and both `app/(customer)/products/page.tsx` and
`app/(customer)/search/page.tsx` imported it. SSR serialised the proxy, the API
received `limit=function(){ throw new Error("Attempted to call PAGE_LIMIT()
from the server but PAGE_LIMIT is on the client...") }`, and both pages crashed
with `Validation failed` (422 from the products endpoint). Fix: `PAGE_LIMIT` now
lives in `lib/constants/index.ts` (imported by server *and* client), and the
client component only exports `ProductListing`.

## Admin modules

Each module under `app/(admin)/admin/*` renders one screen from
`components/admin/`:

| Screen | Source | Behaviour |
| ------ | ------ | --------- |
| Dashboard | `dashboard.tsx` | summary cards from the dashboard API |
| Products | `products-list.tsx`, `product-editor.tsx` | paginated admin list; create/edit with localized fields, `status`, featured flags, SEO block, media attach via `MediaIdPicker`, variant-aware price summary |
| Categories | `categories.tsx` | tree/active listing + CRUD, per-locale slugs |
| Options / Variants | `variants-options.tsx`, `variants.tsx` | option values (COLOR/SIZE/HANDLE) and variant combos |
| Pricing | `pricing.tsx` | the sole price write path (`PATCH /admin/pricing/products/:id`, guard `price.update`) — editors do **not** write price fields |
| CMS pages / Banners | `cms-pages.tsx`, `banners.tsx` | publish/unpublish/archive workflow, date windows |
| SEO | `seo.tsx`, `seo-fields.tsx` | `SeoInput` per `entityType/entityId` via `PUT /admin/seo/...` |
| Media | `media.tsx`, `media-id-picker.tsx` | upload (multipart), ordering, attach; placeholder cards when a doc has no content |

Placeholder/empty assets render a neutral card — a seeded media doc may exist
without a real file on disk, and the subsequent `/media/:id/content` 404 is
expected, not a bug.

## i18n details

- `lib/i18n/index.ts`: `Locale = "en" | "ta"`, `translate(key, locale)` with
  English fallback, `localizeText` for backend `LocalizedText` (+`OrText`
  variant), `toInput` for editors editing both columns.
- `lib/i18n/provider.tsx` powers `useI18n()`; the language switcher sets
  `localStorage` (`deepa.locale`) and a `lang` cookie for the server; SSR always
  renders `en` and hydrates the stored locale client-side.
- Dictionary additions **must** touch both `en.ts` and `ta.ts` (key-identical
  via `Messages`).

## Testing (web)

- `apps/web/tests/{utils,api-request,site-login,variant-selector,errors}.test.*`
  — **5 files, 32 tests** (run under `npm run test:ci`), all passing.
- Notable frictions recorded: labels render with a `*` for required fields, so
  queries use `getByLabelText(/Mobile number/)` regexes; the fetch mock must
  accept a plain-object `Headers` (refresh uses a POJO); the slugify fixture is
  ASCII-only (`"A la carte!"` → `"a-la-carte"`) — prior Unicode accent fixture
  omitted the leading letter; fallback `translate` coverage casts its key with
  `as MessageKey`.

## Verification

- **Static**: `npm run lint` clean, `npm run typecheck` clean, `npm run
  test:ci` green (API 23 suites/117, web 5/32, shared 1/9 — **158 tests**),
  `npm run build` green with the route map above.
- **Live**: API on 3001 (health `database.state=connected`), web dev on 3000,
  seeded demo data (category `handloom-sarees`, product `kanjivaram-silk-saree`
  w/ COLOR/SIZE options + variant, CMS page `about`, banner `home-hero`, admin
  `9876543210` / `Deepa@Admin1` SUPER_ADMIN). Fetched pages — `/`, `/products`,
  `/search`, `/categories`, `/category/handloom-sarees`,
  `/product/kanjivaram-silk-saree`, `/about`, `/login`, `/admin` and all
  `/admin/*` screens — all **200** and storefront HTML carries the seeded
  product name, ₹ price, banner srcset, and the About CMS body. The two
  500s this phase (`/products`, `/search`) were the `PAGE_LIMIT` client-export
  bug and are gone after the fix.
- **Headless notes**: admin content requires an authenticated browser session,
  so client flows were validated by the component tests above plus the Phase 4/5
  backend e2e; the live check confirms the routes render and their shells are
  served. Windows Process/`ChildProcess.kill` quirks during verification were
  tooling-only — servers were launched detached; final stack runs with the
  committed code.

## Conventions

- `PAGE_LIMIT` and shared sort/option constants come from `lib/constants/`
  (server-safe); never export bare values from `"use client"` modules.
- API hostname comes only from `NEXT_PUBLIC_API_URL` (`lib/env.ts`); media paths
  are relative and expanded via `resolveMediaUrl`.
- "no-store" on every API fetch — these pages render fresh content; okay for
  this phase, revisit caching with ISR/revalidation next.