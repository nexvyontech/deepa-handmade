# PHASE 2 — Complete MongoDB Database Design (Deepa Handmade)

Status: **APPROVED-FOR-IMPLEMENTATION DRAFT** (Phase 2 deliverable)
Applies to: `apps/api` (NestJS + Mongoose), local Docker MongoDB, production MongoDB Atlas.
Source of truth: `BRD.pdf` > `FRD.pdf` > approved PHASE0 decisions > Section U.7 canonical state model > PHASE0 Catalogue §J.
Canonical enums live in `packages/shared` (`@deepa/shared`); **never re-declare** them in this repo.

This document defines the COMPLETE data design. No repositories / services / controllers / CRUD / business workflows are implemented in this phase; only foundational Mongoose schema artifacts (see `apps/api/src/database/schemas/`) that mirror this document.

---

## 1. Architecture & Connection Model

- **Database engine**: MongoDB (Mongoose 9.x via `@nestjs/mongoose` 12.x — already installed in `apps/api`).
- **Logical database**: single database named `deepa` for all collections (no cross-database references). Production uses the Atlas connection string; local development uses the Docker container described in `infra/docker/docker-compose.yml`.
- **Connection**: one default Mongoose connection configured through `MONGODB_URI` (`DatabaseModule.forRootAsync`). `DatabaseModule` only initialises Mongoose when `MONGODB_URI` is present so unit tests and builds never require a live database. Local-development URI example:
  `mongodb://deepa:deepa_pass@localhost:27017/deepa?authSource=admin`
- **Production**: Atlas M0 (or higher) connection string via the same `MONGODB_URI` env var — application code is identical locally and in production (only environment values differ).
- **Health**: `GET /api/v1/health` reports MongoDB connectivity via the raw Mongoose connection (`readyState: connected|connecting|disconnected|disconnecting|unknown`, overall status `up`/`down`), and when no URI is configured reports `mode: "not_configured"` (still `up`). The endpoint never exposes the URI, credentials, database name, or any secret.
- **Timestamps**: every mutable collection has `timestamps: true` (`createdAt`, `updatedAt`). Immutable/append-only collections (`inventory-transactions`, `audit-log`, `user-refresh-tokens`, `password-reset-tokens`, `payment-proofs`) use `createdAt` only (no `updatedAt`) and enforce their append-only nature via the validator layer.
- **Naming**: Mongoose collection names (plural, hyphenated) are explicitly fixed in each schema definition (`collection: '...'`). Model names are PascalCase (the entity name used across Phase 3 modules).
- **Soft delete**: only for master/identity data where history is not required and real deletes are never referenced by snapshots: `users` (blocked instead), `addresses`, `media` (tracked statuses instead), `variant-options`, `categories`, `products` (tracked lifecycle status instead). Orders, payments, transactions, audits, quotes, proofs are **never physically deleted**.
- **Unicode / i18n**: all user-generated & content text in English + Tamil is stored as a `LocalizedText` sub-document `{ en: string, ta?: string }` on fields documented below (architecture decision D11 — content population language order remains OPEN). Indexes over localized fields use the `en` sub-field for keyed lookups (slug always a single canonical string).

---

## 2. Complete Collection Catalogue

All collections live in DB `deepa`. Ref = MongoDB reference by `ObjectId` (populated). Snapshot = immutable copy embedded at time of writing (never re-read from source).

| # | Collection | Model | Purpose | Development created in phase |
|---|---|---|---|---|
| 1 | `users` | `User` | Identity for customers AND staff; status lifecycle | 4 (schema in 2) |
| 2 | `roles` | `Role` | Authorization group; permission matrix | 4 (schema in 2) |
| 3 | `permissions` | `Permission` | Granular permission registry (seeded from `@deepa/shared`) | 4 (schema in 2) |
| 4 | `user-refresh-tokens` | `UserRefreshToken` | Refresh-token rotation + revocation | 4 |
| 5 | `password-reset-tokens` | `PasswordResetToken` | Single-use reset tokens | 4 |
| 6 | `addresses` | `Address` | Delivery addresses for customers | 4 |
| 7 | `categories` | `Category` | Catalogue tree (parent/child) | 5 |
| 8 | `products` | `Product` | Sellable masters; catalog + SEO | 5 |
| 9 | `variant-options` | `VariantOption` | Global option masters: colors, sizes, handles | 5 |
| 10 | `product-variants` | `ProductVariant` | Concrete option combinations per product | 5 |
| 11 | `media` | `Media` | R2 upload registry (metadata only) | 5 |
| 12 | `carts` | `Cart` | Basket (guest session or user) with embedded items | 7 |
| 13 | `wishlists` | `Wishlist` | Saved products per user | 5 |
| 14 | `offers` | `Offer` | Discount rules (product/category/festival/first-order/bulk) | 15 |
| 15 | `coupons` | `Coupon` | Code-based discounts | 15 |
| 16 | `orders` | `Order` | Commercial transaction — canonical state machine owner | 7 |
| 17 | `payments` | `Payment` | Payment attempts (UPI/COD), verification, rejection | 8 |
| 18 | `payment-proofs` | `PaymentProof` | Uploaded UPI evidence (resubmit-loop safe) | 8 |
| 19 | `refunds` | `Refund` | Manual UPI refund tracking | 14 |
| 20 | `custom-requests` | `CustomRequest` | Special-order request + clarification log | 10 |
| 21 | `custom-quotes` | `CustomQuote` | Versioned quotation lifecycle (accept → freeze) | 10 |
| 22 | `wholesale-enquiries` | `WholesaleEnquiry` | Bulk enquiry | 10 |
| 23 | `wholesale-tiers` | `WholesaleTier` | Quantity pricing rules (non-overlapping) | 10 |
| 24 | `wholesale-quotes` | `WholesaleQuote` | Bulk quotation (accept → freeze) | 10 |
| 25 | `inventory-items` | `InventoryItem` | Stock master (finished/raw/packaging); balance snapshot | 11 |
| 26 | `inventory-transactions` | `InventoryTransaction` | Immutable movement ledger | 11 |
| 27 | `suppliers` | `Supplier` | Vendor master | 11 |
| 28 | `purchases` | `Purchase` | Purchase orders with cost snapshot | 11 |
| 29 | `production-tasks` | `ProductionTask` | Manufacturing work (material plan + issue) | 12 |
| 30 | `qc-results` | `QcResult` | Inspection checklist/results | 12 |
| 31 | `packing-records` | `PackingRecord` | Parcel records | 13 |
| 32 | `shipments` | `Shipment` | Delivery + tracking | 13 |
| 33 | `return-requests` | `ReturnRequest` | Return workflow + evidence | 14 |
| 34 | `reviews` | `Review` | Customer feedback (eligibility/moderation) | 15 |
| 35 | `notifications` | `Notification` | In-app + channel routing matrix | 16 |
| 36 | `whatsapp-settings` | `WhatsAppSetting` | WhatsApp config (wa.me first, API-ready) | 16 |
| 37 | `cms-pages` | `CmsPage` | Pages/policies/contact/FAQ | 5 |
| 38 | `banners` | `Banner` | Storefront banners | 5 |
| 39 | `invoices` | `Invoice` | Billing documents (printable, GST-ready) | 9 |
| 40 | `settings` | `SiteSetting` | Business config (single document, typed groups) | 5 |
| 41 | `audit-logs` | `AuditLog` | Append-only traceability | 3 |

Collection count: **41** (folds PHASE0 §J catalogue entities including suppliers/purchases/returns/refunds/invoices; raw materials are `InventoryItem.type = RAW` per catalogue row — no separate collection).

---

## 3. Relationship Model

Reference-diagram summary (all references by `ObjectId`, populated only where the Phase 3 read path needs them; see §4 for embedding):

```
User (1) ──< Address                User (1) ──< Cart ──< CartItem(*)embedded
User (1) ──< Order (customerId)     User (1) ──< Review
User (1) ──n Role (roleId)          Role (1) ──n Permission (codes)
User (1) ──< UserRefreshToken       User (1) ──< PasswordResetToken
Order (1) ──< Payment(attempts)     Payment (1) ──< PaymentProof
Order (1) ──< Refund                Order (1) ──n Shipment, PackingRecord
Order (1) ──< ReturnRequest(1..n? → design: 1 active return) 
Order (1) ──n ReturnRequest ↦ Return(evidence)…
ReturnRequest (1) ──< Refund         Refund (1) ──1 Payment
Order (1) ──1 Invoice               Order (1) ──n ProductionTask
Category (1) ──< Category(self: parentId)   Category (1) ──< Product
Product (1) ──< ProductVariant      VariantOption (1) ──n ProductVariant(optionValueIds)
Product (1) ──< Media(ownerType/Id) Product (1) ──< Review
Offer/Scope ──n Product/Category    Coupon (1) ──< Order(validations only)
CustomRequest (1) ──n CustomQuote   WholesaleEnquiry (1) ──n WholesaleQuote
WholesaleTier ─n Product/Category   Supplier (1) ──< Purchase ──< PurchaseItem(*)embedded
InventoryItem (1) ──< InventoryTransaction (ledger)
Purchase (1) ──< PurchaseItem(*)     InventoryItem.n ← ProductVariant (variantStockRef)
ProductionTask ─n InventoryItem(materialPlan/issuedMaterial refs)   ProductionTask ─1 Order
QcResult ─1 ProductionTask|Order     PackingRecord ─1 Order     Shipment ─1 Order|ReturnRequest
Media (1) ─ ownerType+ownerId polymorphic: Product/Proof/Return/Review/Banner/CMS/QR
```

Canonical rule set:
- **Customer→Address**: referenced; a full snapshot is embedded into each `Order` at checkout (addresses remain editable; orders must not change).
- **Product/Variant→OrderItem**: referenced on write for stock revalidation, but the sellable data stored in the order is a full **snapshot** (§6). Orders never re-read current product data.
- **Order→Payment**: 1..n (every attempt retained — resubmits and COD confirm); the order carries a denormalised `paymentStatus` (canonical enum) for queue/list queries while the authoritative transition history lives in `payments` + `order.timeline` + `audit-logs`.
- **Role→Permission**: stored as permission **codes** (strings) on `Role.permissions: string[]` sourced from `@deepa/shared` `ALL_PERMISSIONS`; `Permission` collection is the read-only registry used to build admin UI and validate seeded codes.
- **Media ownership**: polymorphic (`ownerType`, `ownerId`) because proofs, evidence, reviews, banners, CMS and product images share one registry.
- **ReturnRequest→Order**: at most one ACTIVE return per order enforced by a partial unique index (`orderId` where status not in terminal set) at the application layer in Phase 3 (MongoDB partial-unique on active statuses).
- **Refund→Payment**: a refund always references the payment it repays; manual-only (no auto refund), tracked with external reference/UTR.
- **InventoryItem→ProductVariant**: finished-good items may bind to a variant (`variantId`) for stock revalidation on cart/order; balance authoritative in ledger, `available/reserved` on item are projections updated within the same guarded transaction (§17).

---

## 4. Detailed Schema (Data Dictionary)

Sub-document patterns used repeatedly and defined once here:

- `LocalizedText = { en: String, ta?: String }` — used for all translated content.
- `SeoProps = { title?, metaDescription?, ogImage?/mediaId, canonicalUrl?, noindex? }` — products, categories, CMS pages.
- `SeoBlock` on Product/Category/CMS — `SeoProps` stored directly (future `seo` module reads these).
- Money stored as BSON **double** with server-side rounding helpers to 2 decimals for display; amounts kept in rupees (INR). No floating math in the API — a shared `money` helper (Phase 3) will round at edges; design keeps `*inWords` out of schema (derived, not stored).

### 4.1 `users`
- `profileType`: `'CUSTOMER' | 'STAFF'` (required).
- `name`: string (required) — {en} plain display name.
- `mobile`: string (required), **unique**, E.164-normalised (+91…).
- `email`: string, optional, **unique **sparse**(`unique: true, sparse: true`); lowercased.
- `passwordHash`: string (required; bcrypt ≥10 rounds — never store plaintext).
- `roleId`: ObjectId → `roles` (required for STAFF; set to `CUSTOMER` system role for customers).
- `status`: `ACTIVE | SUSPENDED | DISABLED | PENDING_VERIFICATION` (default `PENDING_VERIFICATION` — final registration flow per OPEN decision D7).
- `avatarMediaId`?: ObjectId → `media` (private profile image).
- `lastLoginAt?`, `failedLoginAttempts` (number, default 0), `lockedUntil?` (for brute-force lockout).
- `passwordChangedAt?` (used to revoke JWTs).
- `timestamps: true`, soft-delete via `status=DISABLED` (no physical delete).

### 4.2 `roles`
- `name`: string (canonical, human label).
- `code`: string (required, **unique**) — one of `CUSTOMER | SUPER_ADMIN | ADMIN | SALES_SUPPORT | PRODUCTION | QC | PACKING | INVENTORY` (`ROLES` / `STAFF_ROLES` in `@deepa/shared`).
- `permissions`: `string[]` (default `[]`) — codes from `ALL_PERMISSIONS`.
- `isSystem`: boolean (default false) — system roles (`CUSTOMER`, `SUPER_ADMIN`) marked `isSystem` and immutable; "≥1 Super Admin remains" invariant enforced at the application layer.
- `description?`. Timestamps.

### 4.3 `permissions`
- `code`: string (required, **unique**) — e.g. `payment.verify`.
- `resource`: string (e.g. `payment`), `action`: string (e.g. `verify`), `description?`.
- Read-only registry; seeded via `seed` module from `ALL_PERMISSIONS` (Phase 3 seed step). Timestamps.

### 4.4 `user-refresh-tokens`
- `userId`: ObjectId (indexed), `tokenHash`: string (required, **unique**) — never store raw token.
- `expiresAt`: Date (TTL index, see §16), `revokedAt?`, `replacedByRef?` (rotation chain), `userAgent?`, `ip?`.
- `createdAt` only. Append-only (no update endpoint).

### 4.5 `password-reset-tokens`
- `userId`: ObjectId, `tokenHash`: string (**unique**), `expiresAt`: Date (TTL), `usedAt?`.
- Single-use enforced by `usedAt` guard + tokenHash unique. `createdAt` only. Delivery channel (email vs WhatsApp vs SMS) per OPEN D7/R11.

### 4.6 `addresses`
- `userId`: ObjectId (indexed, `{userId, isDefault}` unique partial), `recipient`, `mobile`, `line1`, `line2?`, `villageTown`, `district`, `state`, `pincode`, `landmark?`, `isDefault` (bool), `label?`.
- Soft-delete (`deletedAt?`). Timestamps.

### 4.7 `categories`
- `name`: LocalizedText (required), `slug`: string (required, **unique**, lowercase kebab).
- `parentId?` (self-ref, tree), `imageMediaId?` → media, `bannerMediaId?`, `active` (bool), `sortOrder` (int).
- `seo`: SeoProps. `timestamps`.

### 4.8 `products`
- `name`: LocalizedText, `slug`: string (**unique**), `sku`: string (**unique**).
- `shortDesc?`, `description` (rich HTML, sanitized server-side).
- Pricing block (canonical pricing model — governed by `price.update`): `basePrice` (required), `mrp`, `discount` (computed/derived), `moq` (min order qty, integer ≥1).
- `weightKg?`, `dimensions?: { length, width, height, unit }`.
- `materialText?`: LocalizedText, `tags: string[]` (lowercased, deduplicated).
- `status`: `DRAFT | ACTIVE | INACTIVE | ARCHIVED` (default DRAFT) — published visibility for storefront.
- `featured` (bool), `customizable` (bool) — enables custom-order path for this product type.
- `seo`: SeoProps, `ratingSummary: { average: number, count: number }` (default 0/0), `searchText` (denormalised lowercased searchable text incl. name/en, slug, tags, sku).
- `createdBy/updatedBy` (userId). Timestamps.

### 4.9 `variant-options` (global option masters: color / size / handle)
- `optionType`: `COLOR | SIZE | HANDLE` (required).
- `value`: LocalizedText (required — e.g. colour name, size label, handle type), `hex?` (for COLOR), `displayOrder`, `active`.
- Unique compound: `(optionType, value.en)` — deduped per type using the English value key.
- Catalog linkage happens per product in `product-variants` (below); option masters are global and recycled across products.

### 4.10 `product-variants`
- `productId`: ObjectId (indexed, compound unique with `optionValueIds`).
- `optionValueIds`: `ObjectId[]` referencing `variant-options` (fixed order: [color, size, handle] — empty members skipped, but composition order canonical in the design).
- `comboHash`: string (sha of sorted option ids) used to guarantee combination uniqueness per product (**unique compound `(productId, comboHash)`**).
- `variantSku?`: string, **unique** sparse.
- `priceDelta`: number (default 0; base + delta = variant price on the storefront).
- `stockMode`: `INVENTORY_TRACKED | AVAILABLE_ONLY`; when tracked, links to one `inventory-items` finished item (`inventoryItemId?`).
- `active` (bool), `imageMediaIds?`, `isCustomColor/size`? (custom option flag — allows free-text custom colour/size at checkout, subject to `customizable` on product).
- Timestamps.

### 4.11 `media`
- `ownerType`: string (e.g. `PRODUCT`, `CATEGORY`, `BANNER`, `CMS`, `PAYMENT_PROOF`, `RETURN_EVIDENCE`, `REVIEW`, `PROFILE`, `SETTINGS_QR`), `ownerId`: ObjectId (compound index `ownerType+ownerId`).
- `kind`: `IMAGE | VIDEO`.
- `bucket`: `PUBLIC | PRIVATE` (visibility classification — proofs/evidence MUST be PRIVATE; product/category/banner/CMS/review-*-approved PUBLIC).
- `storagePath`: string (R2 key — UUID-based, extension present, **unique**).
- `mime`, `sizeBytes` (validated limits — concrete limits OPEN R16), `width?`, `height?`, `durationSec?` (video), `alt?`: LocalizedText.
- `status`: `AVAILABLE | PENDING_MODERATION | REJECTED | HIDDEN` (reviews), `isPrimary` (bool), `sortOrder`.
- `uploadedBy` (userId). `createdAt` only (registry rows are immutable references).

### 4.12 `carts`
- `ownerId?` (ObjectId → users), `sessionId?` (string, guest) — exactly one of ownerId/sessionId required; **unique partial** index on each (one active cart per owner/session).
- `items`: embedded array of `CartItem { productId, variantId?, qty (≥ moq revalidated), moqSnapshot, unitPrice (snapshot), customDetails?: {colorText?, sizeText?, handleText?, notes?} }`, embedded `totals: { subtotal, discount, shipping?, grandTotal }`.
- `couponCode?`, `offerAppliedIds?`, `version` (int, bump on revalidation), `expiresAt` (Date, TTL — guest carts purge).
- Timestamps.

### 4.13 `wishlists`
- `userId`: ObjectId (**unique**), `productIds: ObjectId[]` (dedup) incl. variant awareness optional (Phase 6 can enrich to items). Timestamps.

### 4.14 `offers`
- `name`: LocalizedText, `code?`.
- `type`: `PRODUCT | CATEGORY | FESTIVAL | FIRST_ORDER | BULK`.
- `scope`: `{ productIds: ObjectId[], categoryIds: ObjectId[] }`.
- `discountType`: `FLAT | PERCENT`, `value` (number), `maxDiscount?`, `minOrderValue?`, `bulkRules?: { minQty }`.
- `validFrom`, `validTo`, `active`, `usageLimit?`, `usedCount` (server-side increment), `perCustomerLimit?`.
- Timestamps.

### 4.15 `coupons`
- `code`: string (**unique**, case-insensitive index), `discountType` `FLAT | PERCENT`, `value`, `minOrderValue?`, `maxDiscount?`, `validFrom/To`, `usageLimit?`, `usedCount`, `perCustomerLimit?`, `applicableTo?: { productIds?, categoryIds? }`, `singleUsePerCustomer` (bool), `active`.
- Timestamps. Validation always server-side at checkout; totals never client-computed.

### 4.16 `orders` (canonical state machine owner)
- `orderNumber`: string (**unique**) — e.g. prefix + sequence (prefix from settings; `orderSeq` advances atomically — OPEN: invoice numbering detail R17; sequence counter stored in `settings.orderSeq`).
- `customer`: `{ customerId?, guest: boolean, name, mobile, email?, profileType }` (guest allowed per D5).
- `addressSnapshot`: full embedded `Address` copy.
- `items`: embedded `OrderItem[]` snapshots (§6).
- Prices block (derived, re-validated server-side): `subtotal`, `discountTotal`, `shippingFee`, `codFee?`, `grandTotal`, `offerBreakdown[]` (offer/coupon applied + saved amount snapshot).
- `paymentMethod`: `UPI_MANUAL | COD`, `paymentStatus`: canonical UPI/COD enum (§7) denormalised, `orderStatus`: canonical (§8).
- `source`: `WEB | CUSTOM | WHOLESALE`, `customRequestId?`, `customQuoteId?`, `wholesaleQuoteId?` (conversion provenance).
- `timeline`: embedded `OrderEvent[] { status: string enum|action, note?, byUserId?, at, source }` (append-only within doc — first-class UI timeline).
- `noteRefs`/`adminNotes`: `Note[] { userId, text, at, pinned? }` (phase 9 order management notes).
- `cancellation?: { reason, reasonCode?, at, byUserId }`.
- `idempotencyKey?`: string **unique sparse** (exactly-once checkout creation).
- `invoiceId?`, `shipmentIds?`, `productionTaskIds?` (denormalised id lists for queues; optional and admin-only queries use them).
- Timestamps.

### 4.17 `payments`
- `orderId`: ObjectId (**indexed** compound with `attemptNo` unique), `attemptNo` (int, auto-increment per order).
- `method`: `UPI_MANUAL | COD`, `amount` (number, must equal order grand total — wrong-amount policy enforced at verify time).
- `status`: canonical — UPI: `PAYMENT_PENDING → PROOF_SUBMITTED → UNDER_REVIEW → PAYMENT_CONFIRMED | PAYMENT_REJECTED`; COD: `COD_PENDING → COD_CONFIRMED`.
- `utr?`: string (optional at MVP per D4; duplicates FLAGGED not blocked — partial unique/sparse index for flagging).
- `submittedAt?`, `underReviewAt?`, `rejection?: { reason: canonical `PAYMENT_REJECTION_REASONS`, note, rejectedBy, at }`, `confirmedBy?`, `confirmedAt?`.
- `codConfirmedBy?`, `codConfirmedAt?`.
- Guarding: transitions applied only via a state-condition update (`findOneAndUpdate` with `{_id, status: previous}`) + audit log (§15) — locked payment rules (§8 of this doc / U.7§R10).
- `createdAt` only (attempt history is append/write-once, mutable only by authorised transition).

### 4.18 `payment-proofs`
- `paymentId`: ObjectId (**indexed**), `mediaId` (ObjectId → media, PRIVATE), `utr?`, `amountPaid?`, `notes?`.
- `submittedBy` (userId/customer), `resubmitSequence` (int), `status`: `SUBMITTED | ACCEPTED | REJECTED_REFER_TO_NEW`.
- `createdAt` only (append-only).

### 4.19 `refunds`
- `orderId`, `paymentId` (ObjectId refs, indexed), `returnRequestId?`.
- `amount`, `method`: `UPI_MANUAL` (only for UPI-paid orders; manual-only per decision).
- `status`: `PENDING → APPROVED → PROCESSING → COMPLETED | FAILED | CANCELLED` (canonical).
- `reason` (required), `referenceUtr?`, `initiatedBy?`, `approvedBy/At?`, `processedBy/At?`, `failureReason?`.
- Timestamps. Manual-only enforcement: no auto transition; each hop requires staff action + audit.

### 4.20 `custom-requests`
- `requestNo`: string (**unique**), `customer { customerId?, name, mobile, email? }`.
- `productType?` (ref product), `size`, `colorDesign`, `handle?`, `qty`, `requiredDate?`, `budget?: {min?, max?}`, `notes?`.
- `clarificationLog`: `{ question, answer?, byUserId?, byCustomer?, at }[]`.
- `referenceMediaIds`: ObjectId[] (→ media, PRIVATE — owner + admin access).
- `status`: `NEW | CLARIFICATION | COSTED | QUOTED | ACCEPTED | REJECTED | EXPIRED | CONVERTED`.
- Active-quotes invariant: only one OPEN quote at a time (partial unique `requestId` where status=OPEN).
- Timestamps.

### 4.21 `custom-quotes`
- `requestId`: ObjectId (**indexed**), `version` (int, per request increment).
- Cost block: `{ material, labour, packaging, shipping, misc }`, `margin`, `quoteTotal`, `validUntil`.
- `status`: `OPEN | ACCEPTED | REJECTED | EXPIRED | SUPERSEDED`.
- On ACCEPT the version is **frozen** (no edits; supersedes earlier OPEN versions); `conversion?: { orderId, at, byUserId }`.
- Timestamps.

### 4.22 `wholesale-enquiries`
- `enquiryNo`: string (**unique**), `businessName`, `contactPerson`, `mobile`, `email?`.
- `product?` (ref), `qty`, `expectedPrice?`, `deliveryLocation`, `requiredDate?`, `message?`, `tierId?`.
- `status`: `NEW | QUOTED | ACCEPTED | REJECTED | EXPIRED | CONVERTED`.
- Timestamps.

### 4.23 `wholesale-tiers`
- `name`: LocalizedText, `scope`: `GLOBAL | PRODUCT | CATEGORY` (+ `productIds?`, `categoryIds?`).
- `minQty`, `maxQty` (int, non-overlapping per scope — validated before insert/update), `unitPrice` (explicit price set — may come from scale pricing later), `active`.
- Precedence: most-specific scope wins; ties rejected (application validation). Timestamps.

### 4.24 `wholesale-quotes`
- `enquiryId` (**indexed**), `version`, `tierId?`, product/variant snapshot, `qty`, `unitPrice`, `discount`, `shipping`, `total`, `bulkDeliverySnapshot?`.
- `status`: `OPEN | ACCEPTED | REJECTED | EXPIRED | SUPERSEDED`; `overrideBy?` (staff with `wholesale` override permission), `overrideNote?` (audited).
- Freeze on ACCEPT (mirrors custom-quotes). `conversion?: { orderId, at, byUserId }`.

### 4.25 `inventory-items`
- `itemCode`: string (**unique**), `itemName`: LocalizedText, `type`: `FINISHED | RAW | PACKAGING`.
- `unit`: `KG | METER | PIECE | SET` (uom), `availableQty`, `reservedQty` (projections — authoritative balance lives in `inventory-transactions`).
- `reorderLevel`, `reorderQty?`, `supplierId?`, `lastPurchaseCost?`, `avgCost?`.
- `variantId?` (for FINISHED goods bound to a product-variant), `location?`, `isActive`.
- `updatedAt` guarded by ledger writes (CAS on `_id` when posting a movement, §17). Timestamps.

### 4.26 `inventory-transactions` (immutable ledger)
- `itemId` (**indexed compound:** `itemId` + `seq` unique), `seq` (int, per-item monotonically increasing).
- `type`: `OPENING | RECEIVE | RESERVE | RELEASE | CONSUME | ADJUST | DAMAGE | SALE_OUT | SALE_CANCEL | RETURN_IN`.
- `qty`: number (signed — `positive` increments, `negative` decrements from the balance made explicit by sign; direction validated), `balanceAfter` (denormalised running balance for admin ledger view + audit proof).
- `referenceType/referenceId` (purchase, production task, order, return), `reason` (string — **required** for `ADJUST`/`DAMAGE`, team-owned code + free text).
- `actorId`, `actorRole`, `postedAt` (= createdAt).
- **Invariant**: never update/delete; negative available balance is a guarded error; reversal is a new posting (`RELEASE`/`RETURN_IN`), never deletion.

### 4.27 `suppliers`
- `supplierCode`: string (**unique**), `name`, `contactPerson?`, `mobile`, `email?`, `address?`, `paymentTerms?`, `active`.
- Timestamps. Purchase costs snapshot at PO time, so supplier edits never alter historical costs.

### 4.28 `purchases`
- `purchaseNo`: string (**unique**), `supplierId` (ObjectId).
- `items`: embedded `PurchaseItem[] { itemId, itemCode (snapshot), itemName (snapshot), uom (snapshot), qty, costPerUnit (snapshot), subtotal }`.
- `status`: `DRAFT | ORDERED | RECEIVED | CANCELLED`, `orderedAt?`, `receivedAt?`, `receivedBy?`, `total`, `notes?`.
- Inward posting → creates `RECEIVE` ledger movements atomically guarded (§17). Timestamps.

### 4.29 `production-tasks`
- `taskNo`: string (**unique**), `orderId` (**indexed**), `orderItemRefs: ObjectId[]` (order item snapshot sub-ids for traceability).
- `productSnapshot` / `variantSnapshot` (embedded copies), `plannedQty`, `completedQty`.
- `assignedStaffIds` (ObjectId[] → users; PRODUCTION role), `requiredDate?`.
- `materialPlan`: `{ itemId, qtyNeeded, issuedQty }[]`, `issuedMaterial`: `{ itemId, qty, issuedAt, issuedBy }[]`.
- `status`: canonical `PENDING|ASSIGNED|IN_PRODUCTION|ON_HOLD|REWORK|COMPLETED`, `onHoldReason?`, `timeline[]`, `startedAt?`, `completedAt?`.
- Material issue posts `CONSUME` ledger movements. Timestamps.

### 4.30 `qc-results`
- `qcId`: string (**unique**), `taskId?` / `orderId?` (one required), `checklist`: `{ size, color, weave, handles, qty, other: string[] }` each item `{ status: PASS|FAIL }`.
- `result`: `PASS | FAIL | REWORK` (canonical QC), `remarks` (**required** when FAIL/REWORK), `inspectedBy`, `inspectedAt`.
- Rework bridges back to `ProductionTask.status = REWORK`. Timestamps.

### 4.31 `packing-records`
- `packageNo`: string (**unique**), `orderId` (**indexed**), `itemCount`, `weightKg?`, `dimensions?`, `notes?`.
- `status`: `PACKING | PACKED`, `packedBy`, `packedAt`. Timestamps.

### 4.32 `shipments`
- `shipmentNo`: string (**unique**), `orderId` (**indexed**), `returnRequestId?` (return pickup).
- `courier`: string (manual/courier name — provider abstraction), `trackingNumber?` (**unique** sparse), `shipDate?`, `expectedDelivery?`, `deliveredAt?`.
- `status`: canonical `PENDING|READY_TO_SHIP|SHIPPED|OUT_FOR_DELIVERY|DELIVERED|DELIVERY_FAILED`, `failureReason?`.
- Province/provider agnostic by design (§O migration no-redesign). Timestamps.

### 4.33 `return-requests`
- `returnNo`: string (**unique**), `orderId` (**indexed**).
- `reason` (enum codes + free text `description`), `evidenceRefs` (→ media PRIVATE), `pickupAddressSnapshot?`.
- `status`: canonical `REQUESTED|UNDER_REVIEW|APPROVED|REJECTED|RETURNED|REFUND_PENDING|REFUNDED`.
- `decisionReason` (required on reject/approve-with-clause), `decidedBy`, `decidedAt`, `receivedAt?`, `receivedBy?`, `refundId?`.
- At most one non-terminal return per order (application guard + partial unique). Timestamps.

### 4.34 `reviews`
- `productId`, `customerId`, `orderId`, `orderItemRef?` (one-review-per-order eligibility — window/qty OPEN D10/R18).
- `rating`: int (scale **configured; recommended 1–5 — OPEN D10**), `title?`, `bodyText?`, `imageMediaIds` (→ media, PRE-moderation private, public after approval).
- `status`: `PENDING | APPROVED | HIDDEN`, `moderatedBy?`, `moderatedAt?`, `flagReason?`.
- Unique `(customerId, orderId)` once eligibility rule approved (design keeps it partial-unique for delivered orders). Timestamps.

### 4.35 `notifications`
- `userId` (**indexed**), `type` (event-driven, e.g. `ORDER_STATUS_UPDATE`, `PAYMENT_APPROVED`, `PRODUCTION_ASSIGNED`…).
- `title`/`body` (LocalizedText or {en}), `channel`: `WEB | WHATSAPP | EMAIL | SMS` (provider-abstraction), `status`: `PENDING | SENT | FAILED | READ` (+`error?`).
- `related: { entityType, entityId }`, `readAt?`, `deliveredAt?`.
- Failures retained (no retention delete beyond policy). Timestamps.

### 4.36 `whatsapp-settings`
- `businessNumber`, `mode`: `WA_ME | CLOUD_API` (initial `WA_ME`), `defaultTemplate`: {en, ta} (message template), `templates` (future), `webhookConfig` (future), `ctaTemplates` (product/custom/wholesale/payment CTRs).
- Timestamps.

### 4.37 `cms-pages`
- `slug`: string (**unique**), `type`: `PAGE | POLICY | CONTACT | FAQ`, `title`: LocalizedText, `content`: LocalizedText (sanitized HTML).
- `seo`: SeoProps, `status`: `DRAFT | PUBLISHED | ARCHIVED`, `publishedAt?`, `sortOrder`.
- Timestamps.

### 4.38 `banners`
- `title`?: LocalizedText, `imageMediaId`, `ctaUrl?`, `ctaLabel`?: LocalizedText, `target`?: `PRODUCT|CATEGORY|PAGE|EXTERNAL`.
- `location` (HOME etc.) + `sortOrder`, `active`, `startAt?`, `endAt?`.
- Timestamps.

### 4.39 `invoices`
- `invoiceNo`: string (**unique**; numbering per OPEN R17 — default `prefix + sequence`), `orderId` (**unique**).
- `businessSnapshot` (copy of relevant `settings.business`), `customerSnapshot`, `items` (copied from order items), `subtotal`, `discountTotal`, `shippingFee`, `grandTotal`.
- `paymentMethod`, `paymentStatus` (snapshot), `taxFields`: `{ gstType?, gstin?, cgst?, sgst?, igst? }` (all nullable, GST-ready, **no assumptions**).
- `status`: `ISSUED | PAID | CANCELLED`. Regenerable from order snapshot (deterministic) — no drift risk. Timestamps.

### 4.40 `settings` (single document, typed groups)
- `business: { name, logoMediaId?, address?, phone, email? }`.
- `upi: { enabled, upiId, upiQrMediaId?, instructions: LocalizedText }`.
- `cod: { enabled, rules: { maxOrderValue?, disabledLocations? } }` (default open D9/COD stance R13).
- `shipping: { mode: FLAT_FREE_THRESHOLD, flatFee, freeThreshold, future: zones/pincode }` (numeric defaults OPEN D9).
- `orderPrefix`, `orderSeq` (counter — atomic increment guarded), `notificationRules`, `languageDefaults: { contentLanguageOrder }` (OPEN D11), `review`: `{ ratingScale }` (OPEN D10), `retention`: (OPEN R14 placeholders).
- One document (`_id` fixed), timestamps. All order/payment/invoice-relevant values are **snapshotted** into documents at creation.

### 4.41 `audit-logs` (append-only)
- `actorId?`, `actorRole?`, `action` (canonical action codes, e.g. `PAYMENT_APPROVED|PRICE_CHANGED|INVENTORY_ADJUSTED|REFUND_PROCESSED|ROLE_CHANGED|SETTINGS_UPDATED|REPORT_EXPORTED`).
- `entityType`, `entityId`, `before?` / `after?` (partial JSON diff), `meta: { ip?, userAgent? }`.
- `createdAt` only; **no update/delete possible** (schema has no such endpoints; validator rejects).
- Critical actions that MUST audit (§M): payment approve/reject, price changes, inventory adjustments, refund actions, role/status changes, settings, exports.

---

## 5. Embedding vs Reference Decisions

| Case | Decision | Rationale |
|---|---|---|
| Order items | **Embed** (snapshots) | Immutable commercial record; must never change with product edits |
| Address on order | **Embed** (snapshot) | Same immutability principle |
| Cart items | **Embed** | Single-basket access; no need for standalone query |
| Production material plan/issue | **Embed** in task | Task-scoped; ledger holds authoritative movement |
| Order timeline/events | **Embed** in order | First-class UI timeline; fast single-doc read |
| Purchase items | **Embed** | Snapshot of cost at PO time |
| Checklist QC | **Embed** | Inspection result is a point-in-time record |
| Payment proofs | **Reference** (own collection) | Multiple resubmits; independent append-only history + private media |
| Payments↔Order | **Reference** (Order 1..n Payment) | All attempts retained; order stays lightweight |
| User→Role | **Reference** | Permission matrix changes centrally; user stores `roleId` |
| Role→Permission | **Reference by code (string[])** | No join needed; registry collection validates codes |
| Product/Variant/Media | **Reference** (by `_id`) | Master data lives once; snapshots used at commerce edges |
| Customer addresses | **Reference** | Editable master; snapshot at order |
| Refund→Payment/Return | **Reference** | Traceability chain |
| Quote versions (custom/wholesale) | **Reference** (children) | Version history must be queryable independently |
| Notification `related` | **Reference by type+id** | Polymorphic notification routing |
| Media ownership | **Polymorphic reference** | One registry, many owners |

General rule: **master data is referenced; every commercial/legal/operational record that must remain as-of-when is snapshotted.** Never reconstruct the past from current master data.

---

## 6. Order Item Snapshot Strategy

`OrderItem` (embedded in `orders.items`) freezes every field needed to recompose the line without touching master data:

```
OrderItem {
  lineNo, refId (productId), productSnapshot {
    productId, sku, name {en,ta}, slug
  },
  variantSnapshot { variantId, variantSku, options: [{type, label{en,ta}, value, hex}] },
  qty, moq (applied), unitPrice, mrp, discountPerUnit, subtotal,
  customization { customRequestId?, colorText?, sizeText?, handleText?, notes? },
  snapshotVersion (int — product catalogue version used)
}
```

Rules:
- **Snapshot once at checkout** and never mutate; edits to product/variant/offer/coupon/pricing never affect existing orders.
- Totals validated server-side against snapshots + settings at creation; store `subtotal/discountTotal/shippingFee/grandTotal` at the order level.
- `snapshotVersion` allows Phase 9+ to rerender invoices from the same snapshot deterministically.
- Order item lines are referenced from production tasks (`orderItemRefs`) by the embedded item `_id`.

---

## 7. Payment Data Model (locked — D3 / U.7 §R10)

Canonical states (from `@deepa/shared/constants/payment`):

- UPI: `PAYMENT_PENDING → PROOF_SUBMITTED → UNDER_REVIEW → PAYMENT_CONFIRMED | PAYMENT_REJECTED`
- COD: `COD_PENDING → COD_CONFIRMED`
- Rejection reasons: `PAYMENT_NOT_RECEIVED | WRONG_AMOUNT | UNCLEAR_SCREENSHOT | INVALID_REFERENCE`

Locked rules the data model MUST support (enforced in Phase 8 code, validated here at schema level):
1. Uploading a UPI screenshot moves the payment to `PROOF_SUBMITTED` **only** — never auto-confirm; no payment data field auto-confirms.
2. Only an actor with permission `payment.verify` may transition `UNDER_REVIEW → PAYMENT_CONFIRMED`, and only `payment.reject` may transition `UNDER_REVIEW → PAYMENT_REJECTED`; staff identity (`confirmedBy`/`rejectedBy`) is stored.
3. Every rejection requires `rejection.reason` (canonical code) + free-text `note`.
4. Transitions execute as a **compare-and-set** single-document update `{ _id, status: <previous> }`; a concurrent/unauthorised transition produces a controlled conflict error (no auto retry).
5. Every transition writes an `audit-logs` entry (actor, role, before/after, IP).
6. `Payment.method` is only `UPI_MANUAL` or `COD` — no gateway fields, no auto-payments.
7. UTR is optional (`utr?`) and duplicates are **flagged** (partial sparse index) not blocked (D4).
8. `Refund` is manual-only for UPI-paid orders; each hop requires staff action; external reference/UTR recorded (`referenceUtr`).

`Payment` writes are **append-per-attempt**: an order's first attempt is `Payments[0]`, resubmits create new `payment-proofs` rows against the same (or a new) payment attempt — full attempt history is immutable.

---

## 8. Order Lifecycle (canonical state machine — D3)

Canonical `orderStatus` values: `ORDER_PLACED | PAYMENT_PENDING | PAYMENT_VERIFICATION | PAYMENT_CONFIRMED | ORDER_CONFIRMED | PRODUCTION | QUALITY_CHECK | PACKED | SHIPPED | OUT_FOR_DELIVERY | DELIVERED | CANCELLED | DELIVERY_FAILED | RETURN_REQUESTED | RETURNED`.

Major transitions (validated by the Phase 3+ central guard; invalid transitions throw controlled errors):

- UPI: `ORDER_PLACED → PAYMENT_PENDING → PAYMENT_VERIFICATION → PAYMENT_CONFIRMED → ORDER_CONFIRMED` (rejection path: `PAYMENT_REJECTED` on payment while order can return to `PAYMENT_PENDING` on resubmit).
- COD: `ORDER_PLACED → ORDER_CONFIRMED` (payment stays `COD_PENDING` until confirm).
- Fulfilment: `ORDER_CONFIRMED → PRODUCTION → QUALITY_CHECK → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED`.
- Exception/terminal: `CANCELLED` (from any pre-shipment state, with reason), `DELIVERY_FAILED → (RETRY → OUT_FOR_DELIVERY)`, `RETURN_REQUESTED → RETURNED`.
- Derived `paymentStatus` mirrors the matching payment attempt enum (UPI: from `payments`; COD: `COD_PENDING/COD_CONFIRMED`).

State integrity requirements:
- Every transition writes to `order.timeline` and `audit-logs`.
- The order document itself keeps only the *current* `orderStatus` + `paymentStatus`; full history is in `timeline`.
- Terminal states (`DELIVERED | CANCELLED | RETURNED`) are write-locked by the guard.

---

## 9. Inventory Data Model

- Two artifacts: `inventory-items` (stored current balance projections) and `inventory-transactions` (authoritative immutable ledger).
- **Invariant**: `available = ledger sum`; `reserved` = sum of open `RESERVE` postings minus `RELEASE`/`SALE_OUT`. Projections are refreshed on every posting within the same guarded CAS write (single document) — see §17 — so balance drift is impossible for the MVP scale.
- Movement types: `OPENING | RECEIVE | RESERVE | RELEASE | CONSUME | ADJUST | DAMAGE | SALE_OUT | SALE_CANCEL | RETURN_IN`.
- `ADJUST`/`DAMAGE` require a mandatory `reason`; both are audited ($15).
- Negative `availableQty` is a guarded error (`ADJUST`/`RESERVE` validation).
- Stock revalidation on cart→order: cart re-checks variant `stockMode`+availability; finished-good stock bound via `inventoryItemId` on the variant.
- Raw materials and packaging are `InventoryItem.type = RAW | PACKAGING` (unified item master); production `CONSUME` postings decrement them via `materialPlan`/`issuedMaterial`.
- Low-stock detection = `availableQty <= reorderLevel` (indexed compound for the low-stock queue).
- Reversals are **new postings** (`RELEASE`, `RETURN_IN`, `SALE_CANCEL`), never deletions.

---

## 10. Production / QC / Packing Model

- **ProductionTask** drives manufacturing: `PENDING → ASSIGNED → IN_PRODUCTION → COMPLETED`, with `ON_HOLD` (must carry `onHoldReason`) and `REWORK` (bridge to QC) as non-linear exits. Material plan embeds needs; `issuedMaterial` records actual issue postings (`CONSUME` ledger).
- **QcResult**: `PENDING → PASSED | FAILED | REWORK`, checklist (size/color/weave/handles/qty/other) each PASS/FAIL; `remarks` mandatory on FAIL/REWORK; `inspectedBy` recorded. Rework sets the production task back to `REWORK`.
- **PackingRecord**: `PACKING → PACKED`; parcels counted (`packageNo` unique); re-pack required → `REPACK_REQUIRED` flows back to packing queue.
- **Shipment** owns external tracking: `PENDING → READY_TO_SHIP → SHIPPED → OUT_FOR_DELIVERY → DELIVERED | DELIVERY_FAILED` (+`failureReason`); one order may fan out to several shipments; return pickups use `returnRequestId`.
- Order-level state advances in lockstep: `PRODUCTION … QUALITY_CHECK … PACKED … SHIPPED` only when the respective sub-records reach the required status (guard enforced centrally in Phase 12/13).
- Every operational record embeds a product/variant snapshot and links back to `orderId` for traceability.

---

## 11. Custom Order Model

`CustomRequest` (customer-initiated) → `CustomQuote` (staff costed, versioned):

- Request: `NEW → CLARIFICATION → COSTED → QUOTED → ACCEPTED → CONVERTED` with `REJECTED | EXPIRED` exits. Clarification log is a conversation thread (staff asks, customer answers) — questions/answers embedded.
- Reference images `referenceMediaIds` are **PRIVATE** media (owner + admin only, signed access).
- Costing writes quote versions; each quote has a strict `validUntil`. Only **one OPEN** quote per request (partial unique) — issuing a new version `SUPERSEDES` the previous open one.
- Accepting freezes that version (snapshot semantics; edits prohibited), `SUPERSEDES` others, and `conversion.orderId` links a converted `Order` whose `source = CUSTOM`.
- Quote arithmetic (`material/labour/packaging/shipping/misc + margin`) is frozen into `quoteTotal`; currency = INR.

---

## 12. Wholesale Model

- **WholesaleTier**: quantity bands with non-overlap validation per scope (`GLOBAL` < `CATEGORY` < `PRODUCT` precedence; duplicate/overlapping bands rejected at write). `unitPrice` explicit.
- **WholesaleEnquiry**: `NEW → QUOTED → ACCEPTED → CONVERTED` (`REJECTED | EXPIRED` exits); no tier required initially — sales support may quote directly; `overrideBy` recorded and audited whenever staff bypasses tier pricing.
- **WholesaleQuote**: versioned like custom quotes; freeze on ACCEPT; `conversion.orderId` → `Order.source = WHOLESALE`.
- Both capture the `wholesale-tiers`/price snapshot at quote time so later tier edits never invalidate an accepted quote.
- Permissions involved: `price.update` (tiers/unit price), `order.create` via conversion guarded by RBAC.

---

## 13. Media / R2 Model

- `media` collection stores **metadata only**; bytes live in Cloudflare R2 behind the storage abstraction (`STORAGE_PROVIDER`, `R2_*`).
- Visibility classification `bucket: PUBLIC | PRIVATE`:
  - PUBLIC: product images/video, category/banner/CMS images, UPI QR (checkout-readable), approved review images.
  - PRIVATE: **UPI payment screenshots (never public — signed/authenticated only)**, custom-order reference images, wholesale reference images, return evidence, profile images (public only via controlled redirect), review images pre-moderation.
- Storage names are UUID-based with touch-safe extensions (`storageKey unique`); extension + MIME + magic-byte validation is a Phase 5+ upload concern (limits OPEN R16).
- Private reads are served only through signed/proxied access (never a public URL); no public listing.
- Retention: proofs/evidence retained per policy (durations OPEN R14) — schema freezes only the fields; cleanup is a later retention job.
- `uploadedBy` + ownerType/Id give full provenance for audit.

---

## 14. Audit Logging Model

- `audit-logs` is append-only: `insert` is the only permitted operation (no update/remove; validator rejects any doc-level guard bypass).
- Captured actions (canonical `action` codes) per §M: `PAYMENT_APPROVED | PAYMENT_REJECTED | PRICE_CHANGED | INVENTORY_ADJUSTED | REFUND_APPROVED | REFUND_PROCESSED | ROLE_CHANGED | USER_STATUS_CHANGED | SETTINGS_UPDATED | QUOTE_OVERRIDDEN | REPORT_EXPORTED` (+ event granularity for order transitions: each `OrderEvent` also mirrors an audit row for critical ones).
- `before/after` = partial JSON diff of the guarded entity (no secrets/password hashes ever logged).
- Links: `actorId/actorRole`, `entityType/entityId`, `meta.ip/userAgent`.
- Query path (phase 17): index `(entityType, entityId, createdAt)` and `(actorId, createdAt)`; UI reads are admin-scoped (`audit.read`).

---

## 15. Settings Model

- Single typed document (fixed `_id`) grouping `business / upi / cod / shipping / orderPrefix+orderSeq / notificationRules / languageDefaults / review / retention` (see §4.40).
- **Snapshot rule**: any setting that materially affects a transaction (UPI id/QR/instructions, COD rules, shipping rate/threshold, order prefix/seq) is copied into the consuming document (`order`, `payment`, `invoice`) at creation time. Changing settings never retro-applies.
- `orderSeq` is a guarded counter — incremented atomically with order creation (see §17) so `orderNumber` never collides (unique index is the backstop).
- Admin updates require `settings.manage`; every update is audited (§14).
- OPEN numeric defaults (D9/D12/R13): flat shipping fee, free-shipping threshold, COD policy stance, return/cancellation windows — stored as configurable fields, values pending owner decision; no hardcoded fallback in schema.

---

## 16. Index Strategy

Primary + supporting indexes (compound where the query shape is known). All unique constraints are also listed here because they are integrity invariants (§17).

**Uniques**
- `users.mobile` (unique), `users.email` (unique, sparse), `roles.code` (unique), `permissions.code` (unique), `user-refresh-tokens.tokenHash` (unique), `password-reset-tokens.tokenHash` (unique), `categories.slug`, `products.slug`, `products.sku`, `variant-options (optionType, value.en)` unique, `product-variants (productId, comboHash)` unique, `product-variants.variantSku` (unique, sparse), `media.storagePath` (unique), `carts ownerId` (unique partial where ownerId≠null) & `carts sessionId` (unique partial), `wishlists.userId` (unique), `coupons.code` (unique, case-insensitive), `orders.orderNumber` unique, `orders.idempotencyKey` (unique, sparse), `payments (orderId, attemptNo)` unique, `custom-requests.requestNo` unique, `custom-quotes (requestId, version)` unique, `custom-quotes (requestId, status=OPEN)` partial unique, `wholesale-enquiries.enquiryNo` unique, `wholesale-quotes (enquiryId, version)` unique, `inventory-items.itemCode` unique, `inventory-transactions (itemId, seq)` unique, `suppliers.supplierCode` unique, `purchases.purchaseNo` unique, `production-tasks.taskNo` unique, `qc-results.qcId` unique, `packing-records.packageNo` unique, `shipments.shipmentNo` unique, `shipments.trackingNumber` (unique, sparse), `return-requests.returnNo` unique, `invoices.invoiceNo` unique, `invoices.orderId` unique, `reviews (customerId, orderId)` partial unique (eligibility gate), `users.passwordChangedAt` (not unique — supports revocation).

**Query indexes (non-unique)**
- `User`: `{status, profileType}`, `{roleId}`, `{createdAt}`.
- `Refresh/Reset tokens`: `{expiresAt}` (TTL — see below), `{userId, revokedAt}`.
- `Address`: `{userId, isDefault}`.
- `Category`: `{parentId}`, `{active, sortOrder}`.
- `Product`: `{categoryId, status}`, `{status, featured}`, `{searchText}` (text via `searchText` field; enable text index on `searchText`), `{tags}`, `{createdAt}` desc.
- `VariantOption`: `{optionType, active, displayOrder}`.
- `ProductVariant`: `{productId, active}`, `{inventoryItemId}`.
- `Media`: `{ownerType, ownerId}`, `{bucket, status}`, `{uploadedBy}`.
- `Cart`: `{expiresAt}` (TTL), `{version}`.
- `Offer`: `{type, active, validFrom, validTo}`, `{scope.productIds}`, `{scope.categoryIds}`, `{code}`.
- `Coupon`: `{validFrom, validTo, active}`.
- `Order`: `{customerId, createdAt}`, `{orderStatus, createdAt}` (queues), `{paymentStatus}`, `{source}`, `{createdAt}` desc.
- `Payment`: `{orderId, createdAt}`, `{status, createdAt}` (verification queue), `{utr}` (sparse — duplicate-flag lookup).
- `PaymentProof`: `{paymentId, resubmitSequence}`.
- `Refund`: `{orderId}`, `{status, createdAt}`, `{paymentId}`.
- `CustomRequest`: `{customerId, createdAt}`, `{status}`.
- `CustomQuote`: `{requestId, version}`, `{status, validUntil}`.
- `WholesaleEnquiry`: `{status, createdAt}`, `{businessName}`.
- `WholesaleTier`: `{scope, active}`, `{productIds}`, `{categoryIds}`.
- `WholesaleQuote`: `{enquiryId, version}`, `{status, validUntil}`.
- `InventoryItem`: `{type, availableQty, reorderLevel}` (low-stock), `{supplierId}`, `{variantId}`.
- `InventoryTransaction`: `{itemId, createdAt}`, `{referenceType, referenceId}`, `{actorId}`.
- `Supplier`: `{active}`, `{name}`.
- `Purchase`: `{supplierId, createdAt}`, `{status}`.
- `ProductionTask`: `{orderId}`, `{status, requiredDate}`, `{assignedStaffIds}`.
- `QcResult`: `{taskId}`, `{orderId}`, `{result, inspectedAt}`.
- `PackingRecord`: `{orderId}`, `{status}`.
- `Shipment`: `{orderId}`, `{status, expectedDelivery}`, `{courier, trackingNumber}`.
- `ReturnRequest`: `{orderId}`, `{status, createdAt}`, `{customerId}`.
- `Review`: `{productId, status, createdAt}`, `{customerId}`, `{status}`.
- `Notification`: `{userId, status, createdAt}`, `{type, createdAt}`.
- `CmsPage`: `{slug}`, `{type, status}`, `{status, sortOrder}`.
- `Banner`: `{active, sortOrder}`.
- `Invoice`: `{orderId}`, `{status, issuedAt}`.
- `AuditLog`: `{entityType, entityId, createdAt}`, `{actorId, createdAt}`, `{action, createdAt}`.

**TTL indexes (data retention — durations OPEN R14, schema ready)**
- `user-refresh-tokens.expiresAt` (TTL 30d), `password-reset-tokens.expiresAt` (TTL 24h), `carts.expiresAt` (TTL 30d guest). Revocation state kept via `revokedAt`; wholesale purge after the retention decision (R14).

**Collation**: Tamil+English correctness — content indexes use the `en` collation-friendly field for lookups; `tags` index lowercased. No locale-specific collation on `en` strings (kept simple; unicode-safe by construction).

---

## 17. Data Integrity & Constraint Strategy

**Invariants implemented via unique indexes + guarded writes**
- All `*No`/`orderNumber`/`invoiceNo`/`requestNo`/`enquiryNo`/`taskNo`/`qcId`/`packageNo`/`shipmentNo`/`returnNo` sequences are unique.
- Canonical-enum domains are enforced by mongoose `enum` on every state field (`paymentStatus`, `orderStatus`, production/qc/packing/shipping/return/refund states), mirroring `packages/shared`.
- `Payment.method` enum `UPI_MANUAL | COD`; rejection reason enum.
- Money fields required + non-negative; `qty` integer ≥ MOQ where applicable.
- Sparse/partial uniques: one active cart per owner/session; one OPEN custom quote per request; one non-terminal return per order; UTR duplicate-flag (sparse, non-blocking); review-per-order (pending D10).
- ≥1 Super Admin invariant + role immutability (`isSystem`) at application layer; staff management `staff.manage`.
- No physical deletes on commercial/audit/ledger collections (design rule; validator-hardened in Phase 3+).

**State transition guards (CAS)**: every state change performs `findOneAndUpdate({ _id, status: <expected> }, { $set: ... })`; a stale expectation raises a controlled conflict (409-class) error; invalid transitions never mutate. Applies to payments (locked rules §7), orders (§8), production/qc/packing/shipping/return/refund.

**Idempotent order creation**: checkout carries `idempotencyKey` (unique sparse + settings `orderSeq` atomic increment) so retries cannot create duplicate orders/orderNumber.

**Snapshot immutability**: order items, addresses, invoices, purchase items, accepted quotes — embedded copies written once; schema changes never cascade into old documents (no `ref` cascade updates possible in MongoDB by design — verified in §6/§5).

**Ledger integrity**: `inventory-transactions (itemId, seq)` unique + monotonic seq → no double-posting; balance never directly mutated except via CAS ledger post that recomputes and persists `availableQty`/`balanceAfter` in the same document; negative balances rejected.

**Referential integrity**: foreign keys are `ObjectId` refs but MongoDB does not enforce FKs — Phase 3 service layer deletes/references are guarded (soft-delete for masters with existing refs). Cross-document aggregates are assembled by design (snapshots) rather than joins.

---

## 18. Transaction Boundaries & Phase 3 Dependencies

**MongoDB transaction strategy — single-document atomicity (no multi-document transactions at MVP)**

Each business workflow is expressed as **one guarded atomic document update** so it never needs two-phase commits:

| Workflow | Atomic unit | Mechanism |
|---|---|---|
| Checkout → order create | `orders` create + `settings.orderSeq` increment | `insertOne` then CAS counter update (idempotency key makes retry safe; or update counter first, then insert with rollback-on-failure) |
| Payment transition | `payments` single doc | CAS on `{_id, status: previous}` |
| Proof upload | `payment-proofs` + `payments.status=PROOF_SUBMITTED` | proof insert first, then CAS payment update; duplicate attempt harmless (append-only) |
| Order status change | `orders` single doc | CAS on `{_id, orderStatus: previous}` + timeline append within same `$push` |
| Inventory movement | `inventory-items` single doc + `inventory-transactions` insert | CAS ledger insert `(itemId, seq)` guard; on insert conflict → aborted (two ops where transaction-less: insert-new-seq first then CAS balance update; conflict = no balance change) |
| Quote accept | `custom-quotes` CAS status + supersede siblings | `updateOne({_id, status: OPEN})`; superseding siblings is best-effort with OPEN-guard |
| Refund hop | `refunds` CAS status | single-doc CAS |
| Return evidence | `return-requests` doc + media rows | insert evidence then CAS status; failures logged |

If two-document atomicity is ever required (e.g. ledger + balance split), MongoDB transactions can be introduced behind this same design without schema change — the guard conditions are already single-document and would compose. This keeps the M0 sandbox and Docker single-node path free of transactions while preserving safety at the recorded scale (PHASE0 §T risks).

**Phase 3 dependency map** (design artifacts consumed downstream):

| Phase | Consumer | Design hand-off |
|---|---|---|
| 3 | Backend foundation | `DatabaseModule` already wired; schemas imported from `apps/api/src/database/schemas/`; audit-log + seed bootstrap for `permissions`/`roles`/`settings` |
| 4 | Auth + RBAC | `users`, `roles`, `permissions`, refresh/reset tokens, D7 channel decision |
| 5 | Catalogue + CMS | categories/products/variants/options/media/cms/banners/settings; media R2 abstraction |
| 6 | Storefront | catalog search indexes, `searchText`, i18n LocalizedText |
| 7 | Cart + checkout | carts, addresses, offers, coupons, orders (idempotency), shipping settings |
| 8 | Payments | payments/payment-proofs CAS + locked U.7 rules |
| 9 | Order mgmt | order timeline, notes, cancellation, invoices |
| 10 | Custom + wholesale | custom-requests/quotes, wholesale-*/tiers, conversion → order |
| 11 | Inventory + procurement | items/transactions/suppliers/purchases ledger CAS |
| 12 | Production + QC | production-tasks/material plan/qc-results/rework bridges |
| 13 | Packing + shipping | packing-records/shipments/tracking |
| 14 | Returns + refunds | return-requests/refunds manual tracking |
| 15 | Offers + coupons + reviews | offer/coupon engines, review eligibility (D10) |
| 16 | Notifications + WhatsApp | notifications routing, whatsapp-settings |
| 17 | Reports + invoices + SEO | invoice regeneration, report queries, seo props |
| 19 | Security audit | audit-logs append-only; private media classification |

---

## Open Decisions & Missing Requirements (carried from PHASE0, NOT silently resolved)

- D7 — Registration verification & reset-token delivery channel (email vs WhatsApp vs SMS).
- D9 — Flat shipping fee, free-threshold values; COD stance defaults.
- D10 — Review rating scale (recommended 1–5) & eligibility detail (R18).
- D11 — Content language population order (en-first vs ta-first).
- D12 — Cancellation/return windows, damaged/wrong-product policy, return-shipping responsibility.
- R14 — Data retention durations (proofs, audits, customer data, tokens).
- R16 — Media type/size/dimension limits.
- R17 — Invoice numbering rules beyond configurable prefix+sequence.
- R19 — WhatsApp business number value.
- R20 — Email/SMS channel choice for notifications.

Schema fields exist and are configurable so closing these later requires **no schema migration**.