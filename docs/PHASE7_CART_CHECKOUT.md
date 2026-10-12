# Phase 7 — Customer cart & checkout foundation

Playbook for the Phase 7 build: the customer **cart** and **checkout
preparation** on top of the Phase 5 catalogue and Phase 4 auth APIs, with a
guest-session cart and a server-authoritative order summary. Success criteria:
cart and address APIs work for guests and signed-in customers, prices/MOQs/
totals are always recomputed server-side, the storefront exposes add-to-cart,
a cart page and a checkout review, i18n (en/ta) stays key-identical, and the
whole suite is green (lint, typecheck, unit, e2e, build, live boot).

## Scope

**In scope**

- Customer cart: add-to-cart from the product detail page, persistence,
  quantity updates, variant-aware lines, remove/clear, server-side validation
  and recalculation, cart summary, guest carts, guest→auth merge.
- Checkout **preparation**: delivery address entry/selection, checkout
  validation, shipping calculation foundation, order summary, server-authoritative
  pricing, responsive UI with loading/error/empty states.

**Explicitly out of scope (later phases)** — orders, payments (incl. UPI/COD),
UTR/approval, tracking, inventory/production/shipping execution, returns,
notifications, WhatsApp.

> **Staging note.** `docs/PHASE0_TECHNICAL_PLAN.md` sequenced order creation into
> this phase, but the Phase 7 brief restricts the phase to the cart + checkout
> *foundation*. **No order is created, no payment method is chosen, and checkout
> is never marked as "placed."** `POST /checkout/prepare` validates and returns a
> summary only; the UI states this explicitly. Order creation + payment selection
> arrive in the next phase.

## Backend modules (NestJS)

New modules wired into `app.module.ts`:

| Module | Responsibility |
| ------ | -------------- |
| `settings` | Read-only singleton `settings` document; supplies shipping config |
| `shipping` | `ShippingCalculatorService` — `FLAT_FREE_THRESHOLD` model only |
| `cart` | Cart CRUD, validation/recalculation, guest sessions, merge |
| `addresses` | Customer address book (list/create/update/soft-delete/default) |
| `checkout` | `POST /checkout/prepare` (validate cart + address → summary) |

Shared helpers: `common/guards/optional-auth.guard.ts` (guest-capable routes),
`common/utils/object-id.ts` (`OBJECT_ID_PATTERN`).

### Endpoints (all under `/api/v1`)

- `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:itemId`,
  `DELETE /cart/items/:itemId`, `DELETE /cart`, `POST /cart/validate`,
  `POST /cart/merge`
- `GET /addresses`, `POST /addresses`, `PATCH /addresses/:addressId`,
  `DELETE /addresses/:addressId`, `POST /addresses/:addressId/default`
- `POST /checkout/prepare`

### Guest vs authenticated

- `@Public()` short-circuits the global `AuthGuard` **without** attaching
  `request.user`; guest-capable cart/checkout routes therefore combine
  `@Public()` with a controller-level `@UseGuards(OptionalAuthGuard)`.
- Guests are keyed by `x-cart-session` (a UUID v4 header) → `ownerId`/`sessionId`
  identity in `CartService.resolveIdentity`. `POST /cart/merge` requires a
  signed-in caller (401 otherwise). `GET/POST/PATCH/DELETE /addresses` is
  strictly authenticated; using a saved `addressId` at checkout as a guest is a
  400.
- `OptionalAuthGuard` injects `AccessTokenService` via `@Optional()`, so
  `AuthModule` **must** be imported by every module using the guard
  (`CartModule`, `CheckoutModule`).

### Server-authoritative money

`CartService.liveUnitPrice(productId, variantId)` recomputes the unit price from
the live product `basePrice` + variant `priceDelta` (`roundMoney`) and enforces
MOQ; archived/non-`ACTIVE` products and unrelated/disabled variants are rejected
or dropped. Totals are recomputed on every mutation; `GET /cart` persists only
when lines were corrected. The client never sends a price. Whitelisted DTOs with
`forbidNonWhitelisted: true` reject mass-assignment (e.g. an extra `unitPrice`
prop → `422 VALIDATION_FAILED`).

### Shipping foundation

`ShippingCalculatorService.calculate(subtotal, config)` implements only
`FLAT_FREE_THRESHOLD`: a configured `flatFee` that drops to zero once
`subtotal > 0 && subtotal >= freeThreshold`. Values come from the `settings`
document — never hard-coded. Missing/unsupported config throws
`ApiException.badRequest`. Pincode/courier models plug in later behind the same
`ShippingQuote` boundary.

### Schema note

`settings.upi.instructions` spreads `localizedText`, which marks
`upi.instructions.en` required by Mongoose, so any `SiteSetting` create must
supply `upi: { enabled, instructions: { en } }`. The schema was left untouched
(out of scope); `dto/common.ts` documents this and provides
`optionalLocalizedText` for future write surfaces.

## Web layer

- `lib/cart/session.ts` — UUID v4 guest session in localStorage
  (`deepa.cart.session`), exposed as the `x-cart-session` header.
- `lib/api/request.ts` — new optional `headers` option (extra headers never
  override auth).
- `lib/api/{cart,addresses,checkout}.ts` — typed callers; cart/checkout attach
  the guest session header.
- `lib/cart/context.tsx` — `CartProvider` (inside `AuthProvider`): loads the
  cart once auth resolves, exposes `addItem/updateItem/removeItem/clear/validate`
  and `itemCount` for the header badge, and performs the guest→auth **merge**
  on an `anonymous → authenticated` transition.
- `components/catalogue/variant-selector.tsx` — optional `moq` + `onAddToCart`
  (quantity stepper + add button). Existing no-prop behaviour is unchanged.
- `components/catalogue/product-detail.tsx` — wires add-to-cart + error feedback.
- `components/layout/store-header.tsx` — cart link with a quantity badge.
- `components/cart/cart-page.tsx` + `app/(customer)/cart/page.tsx` — line
  editing, MOQ-aware steppers, validation issues, summary, empty/loading/error.
- `components/checkout/{checkout-form,checkout-page}.tsx` +
  `app/(customer)/checkout/page.tsx` — saved-address selection or inline entry,
  client-side validation mirroring the API rules, and the prepared review with
  the staging notice.
- i18n: `en.ts` / `ta.ts` gain a key-identical cart + checkout section.

## Testing

- **API unit** — `shipping-calculator.service.test.ts` (8),
  `cart.service.test.ts` (identity + 503 availability) → 12 tests.
- **API e2e** (`test/{cart,addresses,checkout}.e2e-spec.ts`, real Mongo):
  add/variant/archived/invalid-qty/update/remove/clear/recalc/stale/client-price
  reject/ownership/guest/merge/shipping-config/checkout validation, and that
  checkout creates **no order** (counted via
  `getModelToken('Cart').db.collection('orders')`). Full e2e: 7 suites / 86 tests.
- **Web unit** — `cart-session`, `cart-context` (load/add/update/remove/merge),
  `checkout-form` (validation + submit + saved address), `i18n-dictionaries`
  (key parity) → web suite 9 files / 51 tests.

Guest e2e sessions use a fresh `uuid()` per run because fixed session UUIDs
accumulate 30-day-TTL carts across runs.

## Live verification (running API + Mongo)

Against the built API on a real Mongo:

| Check | Result |
| ----- | ------ |
| Guest `GET /cart` | empty cart, `shippingStatus: UNAVAILABLE` until configured |
| Add variant line (base 2500 + delta 300, MOQ 2) | unit 2800, lineTotal 5600 |
| `POST /cart/validate` | 0 issues |
| `POST /checkout/prepare` (no shipping config) | `400 Shipping configuration is unavailable` |
| Seed `settings` (flatFee 60, freeThreshold 5000) → prepare | `valid: true`, shipping 0 (free ≥ 5000), no order id |
| Small cart (subtotal 500 < 5000) | shipping 60, grandTotal 560 |
| Guest `POST /cart/merge` | `401` |
| Guest checkout with `addressId` | `400` |
| Empty cart with valid address | `400` |
| Extra non-whitelisted prop | `422 VALIDATION_FAILED` |
| Product `basePrice` +100 | `GET /cart` unit 500 → 600 (server recompute) |
| `orders` collection | `0` (checkout creates no order) |

## Quality gates

`npm run lint`, `npm run typecheck`, `npm run test:ci` (API 129, web 51,
shared 9), `npm run test:e2e` (86), `npm run build` (shared + api + web) — all
green. Web `next build` registers `/cart` and `/checkout` as static client
routes.

## Follow-ups (next phase)

Order creation from a valid preparation, payment method selection (UPI/COD),
settings write surface (admin), inventory reservation, notifications.
