# DEEPA HANDMADE — PHASE 0: TECHNICAL IMPLEMENTATION PLAN

Source of truth priority: **BRD.pdf (v1.0) > FRD.pdf (v3.0) > approved Phase 0 decisions > approved technical architecture.**

Status: **UPDATED — COMPLETE PRODUCT SCOPE WITH FREE INITIAL INFRASTRUCTURE.** No application code, schemas, APIs or UI were created during Phase 0.

---

## SCOPE UPDATE (approved by owner)

Two independent decisions:

1. **PRODUCT SCOPE = COMPLETE.** The product is the full Deepa Handmade platform per BRD + FRD. Nothing is reduced, removed, or labelled MVP-only because the initial user count (~10) or infrastructure is free. Free infrastructure MUST NEVER determine product functionality.
2. **DEPLOYMENT / INFRASTRUCTURE COST = START FREE.** The initial hosting uses free tiers wherever technically and commercially possible, with an architecture designed to migrate to paid/VPS/cloud infrastructure **without application redesign**.

**Final principle: COMPLETE PRODUCT + FREE INITIAL INFRASTRUCTURE + UPGRADEABLE ARCHITECTURE.**

Provider abstraction rule: any external capability that may later move to a paid provider is implemented behind an abstraction/configuration (WhatsApp, notifications, email, SMS, shipping/couriers, storage, payment, auth). No provider-specific business logic is hardcoded.

---

## A. Requirements Summary

### A.1 Business scope (from BRD)
- **Business**: Online storefront for handmade wire-kudai / plastic-wire baskets, bags and related handmade products in Tamil Nadu, India.
- **Languages**: English + Tamil. **Currency**: INR. **Payments**: UPI (manual verification) + Cash on Delivery only; automated UPI verification and payment gateways are out of scope.
- **Business model**: Retail + Custom Orders + Wholesale/Bulk + Future reseller program.
- **Objectives**: Full storefront + catalogue (colors/designs/sizes/pricing), UPI-manual + COD, custom requests, wholesale enquiries, complete admin order-lifecycle (production/QC/packing/shipping), customer engagement (reviews/offers/coupons/notifications/WhatsApp), reporting, invoices.

### A.2 Functional scope (COMPLETE product)
Customer-facing (all required):
- Registration/login, guest checkout, customer profile, address management.
- Catalogue: categories, products, variants, colors, sizes, handles, customization, search, filters, sort, wishlist.
- Cart, checkout, UPI manual payment, COD, payment proof upload, payment verification (approve/reject/resubmit), order tracking.
- Custom orders (request → clarification → costing → quote versions → accept/convert → payment).
- Wholesale/bulk orders (enquiry → tiers → quote → accept/convert).
- Reviews (eligibility + moderation), offers, coupons (server-side), notifications, WhatsApp (wa.me initial, API-ready).
- Cancellation, returns, refund tracking.

Admin-facing (all required):
- Dashboard; customer management; staff management; roles & permissions (granular RBAC).
- Products, categories, variants, pricing, offers, coupons; CMS, banners, SEO.
- Orders, UPI verification, COD; custom orders; wholesale.
- Inventory, raw materials, suppliers, purchase management, stock transactions.
- Production, QC, packing, shipping.
- Returns, refunds; reviews; notifications, WhatsApp; reports, invoices; settings, audit logs.

### A.3 Key global functional rules (FRD)
- Server is authoritative for price, stock, payment state, order state and permissions.
- Every important entity has a unique identifier.
- Historical order/payment snapshots remain stable after catalogue changes.
- Critical state changes record actor and timestamp.
- Uploaded files are validated and securely stored.
- Soft deactivation preferred where historical records depend on a record.
- Client validation improves UX; server-side validation is mandatory.

### A.4 Critical business rules (BRD §35 / FRD BR-001…BR-025)
- Only manual UPI verification + COD supported initially.
- **UPI screenshot upload NEVER automatically marks payment PAID**; only authorized admin approval does.
- Rejection requires a reason; rejected proof may be resubmitted.
- COD requires no payment proof.
- Final totals are server-calculated; price & stock revalidated before order creation.
- Confirmed order financial snapshots remain stable.
- Invalid order transitions blocked; QC failure blocks shipping; packing requires QC pass; shipping requires packed.
- Custom pricing uses quotation; wholesale quantity pricing configurable.
- Inventory adjustments require permission + reason; ledger immutable after posting.
- Critical admin actions audited.
- Payment method availability controlled by settings; disabling preserves history.
- Customers cannot access admin functions.
- Quote acceptance freezes that quote version; expired quote requires renewal.
- Production completion feeds QC; QC rework returns to production.
- Catalogue changes do not rewrite historical orders.

---

## B. Module Map & Dependencies (COMPLETE product)

| # | Module | Depends On |
|---|--------|------------|
| M1 | Authentication | — |
| M2 | Users (customers + staff) | auth, roles |
| M3 | Roles & Permissions | auth |
| M4 | Addresses | users |
| M5 | Settings (business/UPI/COD/shipping/notification/order-prefix) | auth, audit |
| M6 | Media (R2 uploads, presigned, validation) | settings |
| M7 | CMS (pages, banners, policies, contact/FAQ) | users, media |
| M8 | SEO (per-product/category/page metadata + slugs) | products, cms |
| M9 | Categories | users, media |
| M10 | Products (incl. pricing/MRP/discount/MOQ/status) | categories, media |
| M11 | Variants (options: colors/sizes/handles; variant SKU/stock/price-delta; custom size/color) | products |
| M12 | Search, Filter & Sort | products, variants |
| M13 | Wishlist | users, products |
| M14 | Offers (product/category/festival/first-order/bulk discounts) | products, categories |
| M15 | Coupons (codes, server-side validation) | offers |
| M16 | Cart (session/customer, merge, stock/price revalidation) | users, products, variants |
| M17 | Checkout (addresses, shipping calc, totals, idempotent order creation) | cart, addresses, offers/coupons, settings |
| M18 | Orders (state machine, timeline, cancellation, notes, invoices) | checkout, payments |
| M19 | Payments (UPI proof, approve/reject/resubmit; COD confirm) | orders, settings(UPI), media |
| M20 | Refunds (tracking, approval, processing, reference/UTR; manual by default) | payments, orders |
| M21 | Custom Orders (request → clarification → costing → quote versions → convert) | users, products(snapshot), media |
| M22 | Wholesale (enquiry → tier → quote → convert) | users, products, payments |
| M23 | Inventory (items, ledger/movements, low-stock) | products, production, purchases |
| M24 | Raw Materials | inventory |
| M25 | Suppliers | inventory/purchases |
| M26 | Purchases (inward/stock transactions, purchase orders) | suppliers, inventory |
| M27 | Production | orders, inventory |
| M28 | Quality Control | production |
| M29 | Packing | quality-control |
| M30 | Shipping (courier/tracking; provider abstraction) | packing, settings |
| M31 | Returns (request, approval, status, evidence) | orders, shipping, media |
| M32 | Reviews | orders, media |
| M33 | Notifications (in-app + matrix; provider abstraction) | orders/payments/production/packing/shipping |
| M34 | WhatsApp (wa.me initial; Business/Cloud API adapter later) | products, custom-orders, wholesale, payments |
| M35 | Invoices (printable HTML, PDF-ready) | orders, settings |
| M36 | Dashboard (KPIs, queues) | orders, payments, production, shipping |
| M37 | Reports (sales/orders/UPI/COD/inventory/production/QC/shipping/custom/wholesale/returns) | all operational modules |
| M38 | Audit (append-only event log) | all |
| M39 | Media/Storage abstraction (R2 now; object-storage provider later) | settings |

Dependency order (topological): auth → users/roles → settings/audit → media → cms → categories → products → variants → search/wishlist/cart/addresses → offers/coupons → checkout → orders/payments → refunds/returns → custom/wholesale → inventory/raw-materials/suppliers/purchases → production → qc → packing → shipping → reviews/notifications/whatsapp → invoices/dashboard/reports.

---

## C. Customer Journey (COMPLETE product)

```
Discovery        Home → Categories → Search/Filter/Sort → Product Detail (images, video, WhatsApp CTA, SEO lands)
Selection        Choose variant: color + size + handle + quantity (MOQ enforced); custom color/size/design → Custom Order path
Customization    Standard → cart. Non-standard → Custom Order request (product type, size, color/design, handle, qty, required date, budget, notes, reference image)
Cart             Product/image/color/size/qty/unit price/subtotal; ownership enforced; stock+price revalidated; coupon apply
Checkout         Guest OR registered → address (name/mobile/email-if-available/address/city-town/district/state/pincode/landmark) → shipping calc (settings) → discount/coupon → summary (subtotal/discount/shipping/grand total) → payment selection (UPI | COD)
UPI path         Display UPI ID + QR + payable amount → pay externally → upload screenshot + optional UTR → VERIFICATION PENDING
COD path         Select COD (eligibility rules) → no proof → COD_CONFIRMED
Order creation   Server-created exactly once; financial+address+item snapshots frozen; invoice available
Fulfillment      Confirmed → Production (assign/issue/start/progress/rework) → QC (checklist pass/fail/rework) → Packing (packages) → Shipped (courier/tracking) → In Transit → Out For Delivery → Delivered
Notifications    Placed, proof submitted, approved/rejected(+reason), confirmed, production starts, packed, shipped(+tracking), delivered, delivery-failed
Post-delivery    Review (eligibility: delivered orders; rating + text + photos; moderation) → publish; Return request (reason + evidence) → approve/reject → return → refund (manual UPI refund tracking)
Repeat           Wishlist, offers/coupons, WhatsApp reorder, notifications
```

---

## D. Admin Journey (COMPLETE product)

```
Login (JWT + RBAC, role-scoped) → Dashboard (today's orders, pending, verification queue, COD, production pending, ready-to-ship, delivered, revenue)
Payment Verify   Queue → open proof/amount/UTR → Approve (→ PAID + ORDER_CONFIRMED) | Reject (reason mandatory; resubmit loop); every action audited with actor+timestamp
Orders           Search/filter → transition (state-machine guarded) → cancel (policy) → notes → invoice → contact customer
Production       Queue → assign staff → issue material → progress → on-hold(reason) → complete → QC handoff → rework
QC               Queue → checklist (size/color/weave/handle/qty) → pass/fail/rework (remarks required on fail)
Packing          Queue (gated by QC pass) → packages (count/weight/dimensions) → packed
Shipping         Ready queue → shipment → courier/tracking (provider abstraction) → shipped/in-transit/OFD/delivered/failed
Returns/Refunds  Return queue → approve/reject (reason) → receive return → refund tracking → approve → processed → completed (reference/UTR recorded; manual remittance)
Catalog/CMS/SEO  Categories, products, variants, pricing, offers, coupons, media, banners, CMS pages, SEO fields, UPI settings (QR/ID/instructions), business settings, roles/permissions, staff management
Inventory        Items (finished/raw/packaging), suppliers, purchases/inward, reserve/release/consume/adjust/damage/return, ledger, low-stock
Customers        Profile drill-down (orders, spend, addresses), contact
Reports          Sales/Orders/Payments(UPI/COD)/Inventory/Production/QC/Shipping/Custom/Wholesale/Returns + KPI dashboard + exports
Audit            Review append-only audit of critical actions
```

---

## E. Payment State Machine

### E.1 UPI (manual verification) — screenshot is evidence, NOT payment
```
[Checkout: UPI selected]
      │
      v
PAYMENT_PENDING          (order created; UPI ID + QR + amount shown; customer pays externally)
      │
      v
PROOF_SUBMITTED          (customer uploads screenshot + optional UTR)   ← auto on upload
      │
      v
UNDER_REVIEW             (admin verification queue)
      │
      ├─ Admin APPROVE ──→ PAYMENT_CONFIRMED → ORDER_CONFIRMED   (authorized role only; actor+timestamp audited)
      │
      └─ Admin REJECT ───→ PAYMENT_REJECTED (reason REQUIRED: not received / wrong amount / unclear screenshot / invalid reference / free text)
                                   │
                                   └─ Resubmit new proof ──→ PROOF_SUBMITTED (loop)
CANCELLED              from PENDING/PROOF_SUBMITTED/REJECTED per cancellation policy
```
Rules: screenshot upload never sets PAID; only authorized approval confirms; rejection requires reason; duplicate UTR flagged; approved amount reconciled against order payable; every attempt retained historically; disabling UPI affects new checkout only.

### E.2 COD
```
[Checkout: COD selected; eligibility per settings (location/product/order value)]
      │
      v
COD_CONFIRMED → ORDER_CONFIRMED (policy) → production … delivery → cash reconciliation reportable
```
No proof ever requested. Disabling COD affects new checkout only.

### E.3 Refund (UPI-paid only by default; manual remittance)
```
RETURN approved / order cancelled after payment → Refund record created (amount, method=original UPI, status: PENDING → APPROVED → PROCESSING → COMPLETED)
Reference/UTR recorded on completion; manual UPI remittance tracked; NO automatic refunds without an approved provider; REFUNDED_FAULT/REJECTED if return rejected
```

---

## F. Order State Machine (FRD §24 + returns/refunds)

### F.1 Valid transitions
| Current | Allowed Next | Gate |
|---|---|---|
| ORDER_PLACED | PAYMENT_PENDING / COD_CONFIRMED / CANCELLED | payment method selected |
| PAYMENT_PENDING | PROOF_SUBMITTED / CANCELLED | customer uploads proof |
| PROOF_SUBMITTED | UNDER_REVIEW | proof submitted |
| UNDER_REVIEW | PAYMENT_CONFIRMED / PAYMENT_REJECTED | admin decision |
| PAYMENT_REJECTED | PROOF_SUBMITTED / CANCELLED | customer resubmits |
| COD_CONFIRMED | ORDER_CONFIRMED / CANCELLED | COD policy |
| PAYMENT_CONFIRMED | ORDER_CONFIRMED | approved payment |
| ORDER_CONFIRMED | PRODUCTION / CANCELLED | operations |
| PRODUCTION | QC | production complete |
| QC | PACKED / REWORK | QC result |
| REWORK | PRODUCTION | rework |
| PACKED | SHIPPED | shipment created |
| SHIPPED | IN_TRANSIT / DELIVERY_FAILED | carrier |
| IN_TRANSIT | OUT_FOR_DELIVERY / DELIVERY_FAILED | carrier |
| OUT_FOR_DELIVERY | DELIVERED / DELIVERY_FAILED | carrier |
| DELIVERY_FAILED | SHIPPED / RETURNED | resolution chosen |
| DELIVERED | RETURN_REQUESTED / REVIEW_ELIGIBLE | return policy window |
| RETURN_REQUESTED | RETURN_APPROVED / RETURN_REJECTED | admin decision |
| RETURN_APPROVED | RETURN_RECEIVED | return received (evidence) |
| RETURN_RECEIVED | RETURNED / CLAIM | verify condition |
| CLAIM | REFUND_PENDING (UPI-paid) / RETURN CLOSED | refund path |
| REFUND_PENDING | REFUND_APPROVED / REFUND_FAILED | admin |
| REFUND_APPROVED | REFUND_PROCESSING | manual remittance initiated |
| REFUND_PROCESSING | REFUND_COMPLETED / REFUND_FAILED | reference/UTR captured |
| CANCELLED | (sink) | — |
| RETURNED / RETURN_CLOSED / REFUND_COMPLETED / REFUND_REJECTED | (sinks) | — |

### F.2 Explicitly INVALID transitions (must be blocked + logged)
- Any skip past payment/COD gate (ORDER_PLACED → CONFIRMED/PRODUCTION/…).
- PROOF_SUBMITTED → PAYMENT_CONFIRMED without admin; PAYMENT_REJECTED → PAYMENT_CONFIRMED directly.
- QC → SHIPPED (skips packing); PACKED → DELIVERED; PRODUCTION → PACKED.
- UNDER_REVIEW → moved by customer role.
- DELIVERED → SHIPPED/PRODUCTION; CANCELLED → any state; RETURNED → active states.
- REFUND states entered without approved return/cancellation; refund auto-triggered (manual only).

Implementation: single canonical state machine service + permission gates + actor/timestamp logging; rejected transitions audited.

---

## G. Roles & Permissions (granular RBAC)

Roles (approved scope; superset of BRD/FRD names):
- **CUSTOMER** — guest/registered account: browse, cart, checkout, UPI proof + resubmit, order tracking, custom/wholesale enquiries, reviews, wishlist, profile.
- **SUPER_ADMIN** — everything incl. roles/permissions, settings, audit; invariant: at least one remains.
- **ADMIN** — full business management (catalogue, orders, payments verification, inventory, shipping, CMS, offers/coupons, reports, invoices).
- **SALES_SUPPORT** — custom-order clarification + quotations, wholesale quotations, order queries.
- **PRODUCTION** — production queue: assign/start/progress/complete/rework/material issue.
- **QC** — QC queue: inspect/pass/fail/rework.
- **PACKING** — pack (QC-pass only), package data.
- **INVENTORY** — inventory/suppliers/purchases/stock transactions, low-stock.

Permission model (granular, action-scoped), e.g.:
- `product.read / create / update / delete`, `category.*`, `variant.*`, `price.update`, `media.upload`
- `order.read / update`, `order.cancel`, `order.note`
- `payment.verify` (approve/reject), `payment.reject` (reason enforced)
- `refund.approve / process / track`
- `inventory.read / update`, `inventory.adjust`, `supplier.*`, `purchase.*`
- `production.read / update`, `qc.read / update`, `packing.*`, `shipping.update`
- `return.approve`, `review.moderate`, `coupon.*`, `offer.*`
- `cms.*`, `settings.manage`, `role.manage`, `staff.manage`, `report.read`, `report.export`, `audit.read`

Server-side permission resolution on every request; role matrix ex: CUSTOMER has no admin permissions (BR-020).

---

## H. Frontend Route Plan (Next.js App Router, i18n `[lang]`, mobile-first)

### H.1 Public
- `/[lang]/` Home · `/[lang]/products` (search/filter/sort) · `/[lang]/products/[slug]` · `/[lang]/categories/[slug]`
- `/[lang]/custom-order` · `/[lang]/wholesale`
- `/[lang]/about` · `/[lang]/contact` · `/[lang]/faq` · `/[lang]/shipping-policy` · `/[lang]/return-policy` · `/[lang]/privacy-policy` · `/[lang]/terms`
- `/[lang]/cart` · `/[lang]/checkout` (guest checkout supported)

### H.2 Auth
- `/[lang]/login` · `/[lang]/register` · `/[lang]/forgot-password` · `/[lang]/reset-password`

### H.3 Customer (authed) — `/[lang]/account`
- Profile · Orders + `/account/orders/[id]` (tracking) · Pending payments + proof upload/resubmit (`/account/payments/…`)
- Addresses · Custom orders + quote view/accept/reject (`/account/custom-orders/[id]`) · Wholesale status
- Wishlist · Reviews · Returns (`/account/returns/[id]`) · Refund status

### H.4 Admin (role-scoped) — `/admin`
- Dashboard · Payments/verify · Orders + detail · Production · QC · Packing · Shipping
- Returns · Refunds
- Products · Categories · Variants/options · Pricing · Offers · Coupons · Media
- Custom orders (+cost sheet/quote builder) · Wholesale (+tiers) · Customers · Staff · Roles/Permissions
- Reviews · Notifications · WhatsApp · CMS · Banners · SEO · Reports · Invoices · Settings · Audit

Route guards: role-based middleware + server-side authorization on every API.

---

## I. Backend Module Plan (NestJS — modular monolith)

Approved module groups (NestJS modules):
1. `auth` (login/register/logout/refresh/password-reset)
2. `users` (customers + staff profiles, account status)
3. `roles` (roles + granular permissions; permission matrix)
4. `addresses`
5. `settings` (business, UPI, COD, shipping rules, notification rules, order prefix)
6. `media` (R2 uploads, presigned URLs, validation; storage abstraction)
7. `cms` (pages, banners, policies, contact/FAQ)
8. `seo` (meta/slug/OG management)
9. `categories`
10. `products`
11. `variants` (options: colors/sizes/handles; variant SKU/stock/price-delta; custom size/color)
12. `pricing` (base/MRP/discount/MOQ rules)
13. `offers` (product/category/festival/first-order/bulk)
14. `coupons` (code engine, server-side validation, usage limits)
15. `search` (query + filters + sort)
16. `cart` (session/customer, merge, revalidation)
17. `checkout` (address snapshot, shipping calc, totals, idempotent order creation)
18. `orders` (canonical state machine, timeline, cancellation, notes)
19. `payments` (UPI proof, approve/reject/resubmit, UTR flag, COD confirm)
20. `refunds` (tracking, approval, processing, reference/UTR)
21. `custom-orders` (request → clarification → costing → quote versions → accept/expire → convert)
22. `wholesale` (enquiry → tiers → override → quote → accept → convert)
23. `inventory` (items, ledger/movements)
24. `raw-materials`
25. `suppliers`
26. `purchases` (purchase orders, inward/stock transactions)
27. `production` (tasks, assignment, material issue, progress, on-hold, rework)
28. `quality-control`
29. `packing`
30. `shipping` (shipment, courier/tracking; provider abstraction)
31. `returns` (request, approval, status, evidence)
32. `reviews` (eligibility, moderation)
33. `notifications` (in-app + routing matrix; provider abstraction)
34. `whatsapp` (wa.me builder; Business/Cloud API adapter interface, webhooks, templates — future)
35. `invoices` (printable HTML, PDF-ready structure, GST-ready fields)
36. `dashboard` (KPIs, queues)
37. `reports` (all report types + export CSV/XLSX/PDF-if-implemented)
38. `settings` config groups + `audit` (append-only log)

Shared: `common` (guards/decorators/filters/DTO validation/pagination), `config` (env validation), `mongoose-mongo` module, `seed` (bootstrap reference/settings data), `middleware` (helmet, CORS, throttler), `swagger` (OpenAPI).

---

## J. Database Entity Catalogue (COMPLETE product — MongoDB collections; no schemas yet)

Entity list verified against FRD §25 + BRD §34 and adjusted for the approved complete scope. Additions beyond FRD §25 (justified by owner scope update): refunds, suppliers, purchases, returns, invoices; customers/staff and permissions modelled explicitly.

| Collection | Purpose | Main relationships | Important fields | Historical snapshot? |
|---|---|---|---|---|
| `User` | Identity for customers AND staff | Role, Address, Order, Cart, Review, Audit | name, mobile(unique), email?, passwordHash, roleId, profileType(customer/staff), status(active/suspended/disabled), lastLogin | No; role/status changes audited |
| `Permission` | Granular permission registry | Role → Permission(s) | code(unique), resource, action, description | No |
| `Role` | Authorization group | User → Role → Permissions | name(unique), permissions[], isSystem, immutable flags | No |
| `Address` | Delivery addresses | Customer → Address; Order snapshot | recipient, mobile, line1/2, village/town, district, state, pincode, landmark, isDefault, soft-deleted | Snapshot copied to Order |
| `Category` | Catalogue tree | children; Products | name, slug(unique), parentId, image, active, sortOrder, seo | No |
| `Product` | Sellable master | Category, Variants, Media, Reviews, Offers | name, slug, sku(unique), desc, shortDesc, price, mrp, discount, moq, weight/L/W/H, material, tags, seo(title/meta/og), featured, status | Order items snapshot |
| `VariantOption` | Option master | Product → options; Variant combos | type(color/size/handle), value, active, displayOrder, multilingual labels | Snapshot into order line |
| `ProductVariant` | Concrete combo | Product, VariantOptions; Inventory | productId, optionValueIds(unique combo), variantSku?, priceDelta, stockQty(if tracked) | Snapshot into order line |
| `Color` / `Size` | Option value masters (BRD §34 entities) | VariantOption(VariantOption shared for color/size/handle) | value, hex?, sortOrder | Snapshot into order line |
| `Media` | Upload registry (R2) | Products, Banners, Proofs, Returns, Reviews, CMS | ownerRef(collection+id), kind, bucketPath, mime, size, isPrivate, alt | Proofs/evidence retained per policy |
| `Cart` / `CartItem` | Basket (guest session or user) | User/session → items → Product/Variant | ownerId, sessionId?, items[](snapshot), qty(>=MOQ), unitPrice, subtotal, totals, expiresAt | No |
| `Wishlist` | Saved products | User, Product | userId, productIds[] | No |
| `Offer` | Discount rules | Products/Categories; Checkout | type(product/category/festival/first-order/bulk), scope, discountType(flat/%), value, validity, active | Discount snapshot on order |
| `Coupon` | Code-based discount | Checkout; Offer engine | code(unique), discountType(flat/%), value, minOrder, maxDiscount, validityStart/End, usageLimit, usedCount, perCustomerLimit?, active | Discount snapshot on order |
| `Order` | Commercial transaction | Customer, Items(snapshot), Address(snapshot), Payment, Production, Shipment, Return | orderNumber, customerId/guestInfo, items[](snapshot), subtotal/discount/shipping/total, paymentStatus, orderStatus, addressSnapshot, notes, timeline[] | YES — full immutable snapshot |
| `OrderItem` | Order line (embedded) | Order; Product/Variant snapshot | productSnapshot, variantSnapshot(option labels), qty, unitPrice, subtotal | YES |
| `Payment` | Payment attempts | Order; Proofs; Refund | orderId, method(UPI/COD), amount, status(pending/submitted/review/confirmed/rejected), utr?, rejectionReason, verifiedBy, verifiedAt | YES — all attempts retained |
| `PaymentProof` | Uploaded evidence | Payment; Media | paymentId, screenshotRef, utr?, submittedAt, status, reviewAttempt | YES |
| `Refund` | Manual refund for UPI-paid orders | Payment; Return/Cancellation; Audit | orderId, paymentId, amount, method, status(pending/approved/processing/completed/failed/rejected), referenceUtr, processedBy, processedAt, reason | YES |
| `CustomRequest` | Special order request | Customer, Media(ref), Quotes, Order | requestNo, productType, size, color/design, handle?, qty, requiredDate?, budget?, notes, clarificationLog[], status | YES |
| `CustomQuote` (versions) | Quotation lifecycle | CustomRequest; Order | requestId, version, material/labour/packaging/shipping cost, margin, quoteTotal, expiry, status(open/accepted/expired/rejected), acceptedAt | YES — accepted version frozen |
| `WholesaleEnquiry` | Bulk enquiry | Business contact, Quote, Order | enquiryNo, businessName, contactPerson, mobile, email?, product, qty, expectedPrice?, deliveryLocation, requiredDate?, message, tierId? | YES |
| `WholesaleQuote` | Bulk quotation | Enquiry; Order | enquiryId, tier?, unitPrice, discount, shipping, total, overrideBy?, validity, status | YES — accepted version frozen |
| `WholesaleTier` | Quantity pricing rules | Products/Categories; Quotes | scope, minQty..maxQty(non-overlapping), unitPrice, active | No (snapshot to quote) |
| `InventoryItem` | Stock master | Product/Variant; Movements; Suppliers | itemCode(unique), itemName, type(finished/raw/packaging), unit(kg/meter/piece), available, reserved, reorderLevel, supplierId?, purchaseCost | No (balance from ledger) |
| `InventoryTransaction` | Immutable ledger | InventoryItem; Purchase/Production/Adjust | itemId, type(inward/reserve/release/consume/adjust/damage/return), qty, reference, reason(mandatory for adjust/damage), actor | YES — ledger immutable after posting |
| `Supplier` | Vendor master | InventoryItem; Purchases | supplierCode(unique), name, contact, mobile/email, address, active | No (snapshot on purchase) |
| `Purchase` | Purchase orders/inward | Supplier; InventoryItems; Movements | purchaseNo, supplierId, items[](item+uom+qty+cost), receivedDate, status(draft/ordered/received/cancelled), total | YES (cost snapshot) |
| `ProductionTask` | Manufacturing work | Order, Product(snapshot), Inventory(issued), QC | taskNo, orderId, product/variant snapshot, plannedQty, assignedStaff, requiredDate, materialPlan[], issuedMaterial[], completedQty, status(pending/assigned/in-production/on-hold/rework/completed), onHoldReason | YES |
| `QCResult` | Inspection | ProductionTask/Order; Packing | qcId, taskId/orderId, checklist(size/color/weave/handle/qty), result(pass/fail/rework), remarks(required on fail), inspectedBy, inspectedAt | YES |
| `PackingRecord` | Parcels | Order; Shipment | packageNo, orderId, count, weight, dimensions, notes, packedBy, packedAt, status(ready/packing/packed) | YES |
| `Shipment` | Delivery | Order; Packing; Courier/provider | shipmentNo, orderId, courier, trackingNumber(unique), shipDate, expectedDelivery, status(ready/shipped/in-transit/ofd/delivered/failed/returned), failureReason | YES |
| `Return` | Return requests | Order; Shipment; Refund; Media(evidence) | returnNo, orderId, reason, description, evidenceRefs(images/videos), status(requested/approved/rejected/received/returned/claimed/closed), decision reason, decidedBy, decidedAt | YES |
| `Review` | Feedback | Customer, Product/Order | rating(int, configured scale TBD), text, images(media), status(pending/approved/hidden), moderationBy, reviewedOrderId | Moderation audited |
| `Notification` | Communication | User; Order/Payment/Production events | userId, type, title/body, channel(web/whatsapp/email/sms — provider-abstraction), status(sent/failed), relatedOrder, deliveredAt | No (failures tracked) |
| `WhatsAppSetting` | WhatsApp config | Notifications; CTAs | businessNumber, waDefaultMessage templates, apiStatus(wa.me/business-api), templates[] (future), webhookConfig (future) | No |
| `CmsPage` / `Banner` | Content | — | slug(unique), type, title, content(sanitized), seo, banner media, ctaUrl, status(draft/published/archived), sortOrder; translatable fields | No |
| `Invoice` | Billing document | Order; Settings | invoiceNo, orderId, businessDetails(snapshot), customerDetails(snapshot), items, qty, prices, discount, shipping, total, paymentMethod/Status, taxFields(gst-ready, unassumed) | YES — regenerable from order snapshot |
| `Settings` | Business config | — | businessName, logo, upiEnabled, upiId, upiQr, upiInstructions, codEnabled, codRules, shippingRules(flat/freeThreshold + future pincode/zones), orderPrefix, notificationRules, lang defaults | YES — snapshotted into orders at creation |
| `AuditLog` | Append-only traceability | Actor/entity/action | actorId, actorRole, action, entityType, entityId, before/after, timestamp | YES — immutable |

---

## K. File Storage Plan (Cloudflare R2; provider-abstracted)

| File type | Visibility | Notes |
|---|---|---|
| Product images | Public (CDN via Cloudflare) | validated type/size, optimized, safe UUID names |
| Product video | Public (CDN) | validated |
| Category/banner/CMS images | Public (CDN) | |
| UPI QR (setting) | Public (checkout-readable) | admin-replaceable |
| Custom-order reference images | Private | owner + admin only, signed access |
| Wholesale reference image (optional) | Private | owner + admin only |
| UpId payment screenshots | Private | NEVER public; signed/authenticated access only |
| Return evidence (images/videos) | Private | admin/owner only |
| Review photos | Private pre-moderation → Public after approval | published images served via CDN |
| Profile images | Private→Public via controlled redirect | |

Access: presigned PUT writes, public reads via CDN, private reads via authenticated signed redirects/proxies. Extension + MIME + magic-byte validation; no executables; UUID storage names; no public listing; proofs/evidence retained per data-retention policy. Storage behind a `media`/object-storage abstraction so R2 can later map to S3 or higher R2 tiers without redesign.

---

## L. API Plan (REST groups — conceptual, no implementation)

Auth: `POST /auth/register|login|refresh|logout|forgot-password|reset-password`, `GET /auth/me`.
Users/roles: `/users/me`, `/users/me/addresses`, `/admin/users`, `/admin/users/:id/status`, `/admin/staff`, `/admin/roles`, `/admin/roles/:id/permissions`, `/admin/permissions`.
Catalog: `/catalog/categories`, `/catalog/products` (search/filter/sort/paginate), `/catalog/products/:slug`, `/catalog/products/:slug/variants`, `/admin/products`, `/admin/products/:id/media`, `/admin/variants`, `/admin/options`, `/admin/pricing`.
Cart/wishlist: `/cart`, `/cart/items/:id`, `/wishlist`.
Offers/coupons: `/shop/coupons/validate`, `/admin/coupons`, `/admin/offers`, `/admin/offers/:id`.
Checkout/orders: `/checkout/shipping`, `/checkout` (idempotent), `/orders`, `/orders/:id`, `/orders/:id/timeline`, `/orders/:id/cancel`, `/orders/:id/invoice`, `/admin/orders`, `/admin/orders/:id/status`, `/admin/orders/:id/notes`.
Payments: `/payments/:orderId/instructions` (QR/ID/amount), `POST /payments/:id/proof`, `/payments/:id`, `/admin/payments/verify`, `/admin/payments/:id/approve`, `/admin/payments/:id/reject`, `/admin/orders/:id/cod-confirm`.
Refunds: `/admin/refunds`, `/admin/refunds/:id/approve|process|complete|fail`, `GET /account/refunds`.
Custom: `/custom-requests`, `/custom-requests/:id`, `/admin/custom-requests/:id/clarify|cost|quote|quote/:ver/revise`, `/custom-requests/:id/accept|reject`, `/admin/custom-requests/:id/convert`.
Wholesale: `/wholesale/enquiries`, `/admin/wholesale/enquiries/:id/quote|override`, `/admin/wholesale/tiers`, `/admin/wholesale/:id/convert`.
Inventory/procurement: `/admin/inventory`, `/admin/inventory/items`, `/admin/inventory/movements`, `/admin/inventory/items/:id/ledger`, `/admin/inventory/low-stock`, `/admin/suppliers`, `/admin/purchases`, `/admin/purchases/:id/receive`.
Operations: `/admin/production`, `/admin/production/:id/assign|issue|start|progress|hold|complete|rework`, `/admin/qc`, `/admin/packing`, `/admin/shipping`, `/admin/shipping/:id/track|ship|deliver|fail|return`.
Returns: `/returns` (customer), `/returns/:id/evidence`, `/admin/returns`, `/admin/returns/:id/approve|reject|receive|return|claim`.
Engagement: `/reviews` (eligibility), `/products/:id/reviews`, `/admin/reviews/:id/moderate`, `/notifications`, `/admin/notifications`, `/admin/whatsapp` (settings).
CMS/SEO: `/cms/pages/:slug` (public), `/admin/cms/pages`, `/admin/banners`, `/admin/seo`.
Dashboard/reports: `/admin/dashboard`, `/admin/reports/:type`, `/admin/reports/:type/export`.
Settings/audit: `/admin/settings`, `/admin/audit`.
Media: `POST /media/upload` (presigned), `POST /media/signed-url` (private reads).

OpenAPI/Swagger documented; `v1` prefix.

---

## M. Security Plan (COMPLETE product)

- **Authentication**: JWT access (short-lived) + refresh-token rotation + revocation on logout/password change; single-use reset tokens; rate-limited auth.
- **Password**: bcrypt(≥10 rounds); configured policy (min length etc.).
- **Authorization**: granular RBAC enforced server-side on every route/action; permission resolution service; ownership checks (customer data owner-only); customer/admin separation (BR-020); least privilege.
- **Input validation**: class-validator DTOs; sanitize rich content; server-side price/stock/payment/order-state validation on every write; no client-controlled totals.
- **Rate limiting**: `@nestjs/throttler` (strict on auth/proof-submit/checkout; general API limits).
- **File upload security**: extension + MIME + magic-byte validation; size limits; UUID storage names; private buckets with signed access for proofs/evidence; no public listing; no executables.
- **JWT security**: strong secrets in env only; short-lived access; rotation; revocation on critical events.
- **Sensitive data protection**: UPI proofs + customer PII access-controlled; field-level exclusion in DTOs; object storage bucket policy; private proof URLs not guessable.
- **Audit logging**: append-only for critical actions (payment approve/reject, price changes, inventory adjustments, refund actions, role/status changes, settings, exports) with actor/timestamp/before-after.
- **Admin security**: strong password policy + rate-limited admin login; role manager restricted to SUPER_ADMIN; "≥1 Super Admin remains" invariant; UPI/settings changes strongly authorized.
- **HTTPS/SSL**: Cloudflare edge TLS (full strict).
- **Generic**: helmet security headers, strict CORS, MongoDB query safety (no raw injection, restricted operators where applicable), no secrets in code/repo, no verbose errors.
- **Data protection**: encryption at rest via Atlas (free tier available), backups + tested restore (FRD DoD).

---

## N. Testing Plan (Jest + Supertest)

- **Unit**: price/shipping/coupon/offer/tier/quote/stock math; state-machine transition guards; permission resolver.
- **Integration**: service/repository with MongoDB (mongodb-memory-server); ledger immutability; snapshot stability.
- **API**: every endpoint; validation 400s; permission 403s; auth 401s.
- **Authentication**: register/login/refresh/reset, wrong password, duplicate mobile/email, suspended blocked, reset single-use, rate-limit.
- **Payment UPI**: full journey; upload never auto-pays; approve authorized-only; reject-with-reason enforced; resubmit loop; duplicate UTR flag; wrong-amount policy; disable affects new checkout only; history retained.
- **COD**: eligibility, no proof, confirmation.
- **Orders/state machine**: happy path + every invalid transition blocked+logged; cancellation policy; idempotent creation; snapshot stability.
- **Returns/refunds**: request→approve/reject→receive→refund states; manual-only refund enforcement; evidence handling.
- **Inventory/procurement**: ledger movements, negative stock blocked, adjustment reason, purchase→inward, reversal-not-deletion.
- **Custom/wholesale**: full quote lifecycle, version freeze, expiry, tier non-overlap, override permission.
- **Production/QC/Packing/Shipping**: gating, rework loop, tracking, failure reasons.
- **Offers/coupons**: server-side cannot alter totals; usage/validity limits.
- **Reviews/notifications/WhatsApp**: eligibility/moderation; notification routing matrix; wa.me message building (both languages).
- **Permissions**: full action×role matrix; ownership checks.
- **Reports/invoices**: reconcile vs authoritative records; export parity.
- **Security**: authorization bypass, upload abuse, rate-limit, sensitive-data exposure, audit integrity.
- **QA/UAT scenario catalogue**: FRD §33; acceptance per FRD Module criteria.

---

## O. Deployment Plan (FREE tiers → paid migration, no redesign)

### O.1 Initial (free/minimum cost)
```
GitHub (source + Actions free minutes)
   ├─ CI: lint/typecheck/unit/integration → build
   ├─ deploy:web → Cloudflare Pages (Next.js)
   └─ deploy:api → Render free tier (NestJS; 1 instance; graceful sleep handling)
MongoDB Atlas M0 sandbox
Cloudflare R2 (free allowance) behind Cloudflare
Cloudflare DNS + SSL (edge TLS full strict) + custom domain
```
Environments: dev/staging/prod (staging optional early). Secrets via Render dashboard/cloud secrets + CI secrets — never in repo.

### O.2 Migration paths (no app redesign)
- Render free → paid Render → VPS/AWS/other: same container image and start command; only infrastructure changes.
- Atlas M0 → paid tier (M10+): same URI/driver.
- R2 → higher R2 tier or S3: `media` storage abstraction (S3-compatible SDK already used by R2).
- WhatsApp wa.me → Business/Cloud API: `whatsapp` provider adapter.
- Notifications email/SMS → provider adapters + env-driven config.
- Shipping manual → courier integrations: `shipping` provider abstraction.
- Frontend: Pages → Cloudflare paid/other host via deploy-agnostic build output.
- Redis only later if a documented requirement proves need; no Kafka/K8s/Elasticsearch.

---

## P. Environment Variables (categories — no real secrets)

- App: `NODE_ENV`, `PORT`, `APP_BASE_URL`, `API_BASE_URL`, `WEB_BASE_URL`, `CORS_ORIGINS`, `TZ=Asia/Kolkata`
- Mongo: `MONGODB_URI`
- JWT: `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES`, `JWT_ISSUER`
- R2/Storage: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_HOST`, `STORAGE_PROVIDER` (abstraction)
- Rate limit: `THROTTLE_TTL`, `THROTTLE_LIMIT`, `AUTH_THROTTLE_*`
- Password policy: `PASSWORD_MIN_LENGTH` + policy flags
- WhatsApp: `WHATSAPP_MODE=wa.me|api`, `WHATSAPP_BUSINESS_ID`/`WHATSAPP_TOKEN` (future, inferred), `WHATSAPP_PHONE_ID`
- Notifications: `NOTIFY_PROVIDER` (web/whatsapp/email/sms), provider keys (future)
- Email/SMS (future/optional): `SMTP_*`, `SMS_PROVIDER_*`
- Cloudflare deploy (CI): `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `CF_PROJECT_NAME`
- Seeds: `SEED_SUPER_ADMIN_MOBILE/EMAIL/PASSWORD` (first-run bootstrap)

---

## Q. Development Phases (approved sequence — build and verify each before next)

| Phase | Scope |
|---|---|
| 0 | Requirements + decisions (this document) |
| 1 | Repository + architecture (monorepo `apps/web`+`apps/api`, shared package, tooling, CI) |
| 2 | **Complete** database design (full Mongoose entity set from Catalogue J, indexes, relations) |
| 3 | Backend foundation (NestJS bootstrap, config, Swagger, errors, health, middleware, audit infra) |
| 4 | Authentication + RBAC (register/login/refresh/reset, roles+granular permissions, seed Super Admin) |
| 5 | Catalogue + CMS (categories, products, variants/options, pricing, SEO, CMS pages/banners) |
| 6 | Customer frontend (storefront routes, product browsing, search/filter/sort, i18n en+ta) |
| 7 | Cart + checkout (guest + registered, addresses, shipping calc, coupons/offers, totals, order create) |
| 8 | Payment (UPI proof flow, approve/reject/resubmit, COD, verification queue) |
| 9 | Order management (state machine, timeline, cancellation, notes, invoices) |
| 10 | Custom + wholesale (request/clarification/costing/quotes/convert; enquiries/tiers/override/quotes/convert) |
| 11 | Inventory + procurement (items, ledger, raw materials, suppliers, purchases, low-stock) |
| 12 | Production + QC (tasks, assignment, material issue, progress, checklist, rework) |
| 13 | Packing + shipping (packages, shipments, courier/tracking, delivery states) |
| 14 | Returns + refunds (requests, evidence, approval, refund tracking w/ manual UPI, reference/UTR) |
| 15 | Offers + coupons + reviews (offer engine, coupon codes, review eligibility/moderation) |
| 16 | Notifications + WhatsApp (in-app matrix, wa.me builder, provider abstractions) |
| 17 | Reports + invoices + SEO (all report types/exports, printable invoices, metadata) |
| 18 | Testing (unit/integration/API/e2e per Section N; QA-UAT catalogue) |
| 19 | Security audit (Section M verification; payment/state machine hardening; backup restore test) |
| 20 | Deployment (Pages + Render + Atlas + R2 + GitHub Actions, environments, secrets) |

---

## R. Missing Requirements

Resolved by approved scope update are marked RESOLVED; genuinely still-open items remain:

1. **RESOLVED — Staff roles**: complete RBAC with SUPER_ADMIN/ADMIN/SALES_SUPPORT/PRODUCTION/QC/PACKING/INVENTORY + CUSTOMER in scope (owner decision).
2. **RESOLVED — Coupons/offers**: full offer engine + coupon codes, server-side validated (owner decision).
3. **RESOLVED — Guest checkout**: supported; captured name/mobile/email-if-available/address/city-town/district/state/pincode/landmark (owner decision).
4. **RESOLVED — i18n architecture**: English + Tamil, proper i18n, content fields designed for future translation, no forced duplicate entry (owner decision). **OPEN sub-item**: translation depth per content type (UI-first; product/CMS content population language order — English-first vs Tamil-first) — see decision D11 note.
5. **RESOLVED — Invoice**: printable + HTML + PDF-ready architecture + GST-ready fields with no GST assumptions (owner decision).
6. **RESOLVED — Shipping**: configurable, flat + free-threshold initially, future pincode/zones/courier via abstraction, no hardcoded prices (owner decision). **OPEN sub-item**: default flat amount / free-threshold value (config default).
7. **RESOLVED — Returns/refunds**: full returns + manual UPI refund tracking (reference/UTR), no automatic refunds without approved provider (owner decision). **OPEN sub-items**: cancellation/return window values, damaged/wrong-product policy, return-shipping responsibility.
8. **RESOLVED — WhatsApp**: wa.me + prefilled messages + product/custom/wholesale/payment CTAs; Business/Cloud API, webhooks, templates supported by abstraction later (owner decision).
9. **RESOLVED — UTR**: optional at MVP; duplicates flagged (owner decision).
10. **RESOLVED — Canonical state names/statuses (D3)**: BRD vs FRD naming — owner approved FRD v3.0 enum names as canonical. Exact locked state model in the "D3 CANONICAL STATE MODEL" section below. Payment rule locked: UPI screenshot upload = `PROOF_SUBMITTED`, never auto-confirmed; only `payment.verify` transitions `UNDER_REVIEW → PAYMENT_CONFIRMED` / `PAYMENT_REJECTED`; rejection requires reason; server-side transition validation; audit logs.
11. **OPEN — Registration verification**: FRD "optional verification" — no mandatory verification recommended; **open**: password-reset token delivery channel (email vs WhatsApp vs SMS) given email is optional.
12. **OPEN — Review rating scale**: "configured scale" (D10): recommend 1–5 stars; needs approval.
13. **OPEN — COD eligibility defaults**: rules configurable (location/product/order value) — default stance (enabled everywhere initially) needs owner confirmation.
14. **MISSING REQUIREMENT — Data retention durations** (proof/audit/customer records; FRD §35 open).
15. **MISSING REQUIREMENT — Performance response budgets** (FRD NFR defers to technical design).
16. **MISSING REQUIREMENT — Media limits**: concrete image/video type, size and dimension limits not specified.
17. **MISSING REQUIREMENT — Invoice numbering rules** beyond configurable order prefix.
18. **MISSING REQUIREMENT — Review eligibility detail** beyond "delivered customers" (e.g., window, one-per-order).
19. **MISSING REQUIREMENT — WhatsApp number/template value** (business setting; needs actual number from owner).
20. **MISSING REQUIREMENT — SMS/email infrastructure** (none required in initial payments/notification path; channel choice for notifications beyond web + WhatsApp/manual).

---

## S. Requirement Conflicts (status updated)

1. **C1 — Staff roles scope** (BRD "Staff (future)" vs FRD current): **RESOLVED by approved decision** — full RBAC in scope now.
2. **C2 — Coupons** (BRD "future" vs FRD Module 16): **RESOLVED by approved decision** — complete coupon/offer engine in scope.
3. **C3 — Payment/order state naming** (BRD vs FRD): **RESOLVED by D3 approval** — canonicalized to FRD v3.0 names + production statuses normalized; see D3 CANONICAL STATE MODEL.
4. **C4 — Production statuses** (BRD vs FRD): **RESOLVED** — bundled into D3 (FRD Module 13 statuses + QC/rework bridges).
5. **C5 — WhatsApp channel** (manual/wa.me vs API): **RESOLVED by approved decision** — wa.me initial, API-ready abstraction.
6. **C6 — Email** (BRD optional vs FRD fields): **OPEN** — whether any email capability ships at go-live (fields will exist; channel adapter optional).

---

## T. Technical Risks

- **Scalability**: single NestJS instance + M0 Atlas is fine for early scale; keep modules independent; no free-tier-blocking in-app queues; monitor M0 storage; Render free sleep latency (mitigate: keep-alive or migrate early).
- **Security**: manual UPI verification is the highest-risk surface — approval bypass, forged/unclear proofs, duplicate UTR abuse, unauthenticated proof exposure; mitigated by strict RBAC + private R2 + signed reads + audit + rates.
- **File storage**: public/private misclassification of proofs; upload abuse; guessed URLs; mitigated by private buckets, presigned PUT, magic-byte validation, UUID names, no listing.
- **Payment verification**: screenshot evidence weakness; wrong amounts; reject/resubmit loops and disputes; require explicit admin reconciliation UI comparing amount; full attempt history.
- **Inventory consistency**: cart→order stock revalidation and reserve/consume semantics must be atomic; ledger immutable; avoid double consumption.
- **Order state risk**: divergent BRD/FRD naming; illegal transitions; mitigated by canonical state machine + central guard + actor/time logs + tests (C3/C4 must be closed in Phase 2).
- **Custom/wholesale quoting**: version drift, expiry/acceptance races, override abuse; version freeze on accept, expiry checks, override permission + audit.
- **Returns/refunds**: manual refunds must be diligently tracked (reference/UTR) to prevent money-lost; no automatic refunds.
- **Deployment**: Render sleep, Pages build config, env drift, secret leakage; use CI secrets, env templates, preview environments.
- **Backup/recovery**: M0 snapshot limits; run and verify restore procedure (FRD DoD).
- **i18n/data**: Tamil + English in DB — Unicode-safe schema, collation/indexes early; avoid duplicate content entry burden.
- **Provider drift**: keep WhatsApp/notifications/shipping/storage behind abstractions; no hardcoded provider logic.

---

## U. Final Recommendation (updated)

### U.1 Proposed architecture
Modular monolith: Next.js (App Router, TS, Tailwind, i18n en+ta) + NestJS REST API (TS) in one monorepo w/ shared package; MongoDB Atlas (Mongoose); R2 via storage abstraction; Cloudflare Pages (web) + Render (API); Cloudflare DNS/SSL; GitHub + GitHub Actions; JWT + refresh; Swagger/OpenAPI. No Redis/Kafka/K8s/Elasticsearch at start. Single deployable API process; provider abstractions for WhatsApp/notifications/shipping/email/SMS/storage.

### U.2 Repository structure
```
deepa/
  apps/web/          # Next.js storefront + admin dashboard (i18n)
  apps/api/          # NestJS REST API
  packages/shared/   # shared types/DTOs/enums (state machine, permissions)
  infra/             # deployment notes, provider-adapter reference
  docs/              # BRD/FRD + this plan
  .github/workflows/ # ci, deploy-web, deploy-api
```

### U.3 Module dependency order
auth → users/roles → settings/audit → media → cms → categories → products → variants → search/wishlist/cart/addresses → offers/coupons → checkout → orders/payments → refunds/returns → custom/wholesale → inventory/procurement → production → qc → packing → shipping → reviews/notifications/whatsapp → invoices/dashboard/reports.

### U.4 Implementation sequence
Section Q phases 0–20 (approved). Phase 2 (complete DB design) is unblocked — D3 (state naming) closed; see D3 CANONICAL STATE MODEL.

### U.5 Remaining decisions (must be closed before the phase they gate)

| ID | Decision | Status | Gated phase |
|---|---|---|---|
| D1 | Staff roles | RESOLVED (full RBAC now) | 4 |
| D2 | Coupons/offers | RESOLVED (complete engine) | 7/15 |
| D3 | Canonical order/payment state names + production statuses | **RESOLVED** (owner-approved enum model below) | 2 (DB design) |
| D4 | UTR | RESOLVED (optional, flag duplicates) | 8 |
| D5 | Guest checkout | RESOLVED (supported) | 7 |
| D6 | WhatsApp mode | RESOLVED (wa.me initial, abstraction) | 16 |
| D7 | Registration verification + reset-token channel | **OPEN** | 4 |
| D8 | Invoice form | RESOLVED (printable HTML + PDF-ready) | 9/17 |
| D9 | Shipping defaults (flat amount/free threshold/COD stance) | **PARTIAL** (architecture resolved; numeric defaults open) | 5/7 |
| D10 | Review rating scale | **OPEN** (recommend 1–5) | 15 |
| D11 | i18n depth/content language order | **PARTIAL** (architecture resolved; content language order open) | 6 |
| D12 | Cancellation/return window + damaged/wrong-product policy + return shipping | **PARTIAL** (architecture resolved; values open) | 9/14 |

Additional small open items: data retention durations, performance budgets, media limits, invoice numbering, review-eligibility detail, WhatsApp business number value, email/SMS provider choice.

### U.6 Risks
Section T. Highest priority: payment-verification security/correctness, order state integrity (D3 now locked — transition validation + audit in design), inventory consistency, manual refund tracking, free-tier deployment reliability.

### U.7 D3 CANONICAL STATE MODEL (approved — machine-readable source of truth)

Customer-facing labels may be simplified, but DB enums and API values MUST stay exactly as below.

**Payment — UPI:**
`PAYMENT_PENDING`, `PROOF_SUBMITTED`, `UNDER_REVIEW`, `PAYMENT_CONFIRMED`, `PAYMENT_REJECTED`

**Payment — COD:**
`COD_PENDING`, `COD_CONFIRMED`

**Order:**
`ORDER_PLACED`, `PAYMENT_PENDING`, `PAYMENT_VERIFICATION`, `PAYMENT_CONFIRMED`, `ORDER_CONFIRMED`, `PRODUCTION`, `QUALITY_CHECK`, `PACKED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `DELIVERY_FAILED`, `RETURN_REQUESTED`, `RETURNED`

**Production:**
`PENDING`, `ASSIGNED`, `IN_PRODUCTION`, `COMPLETED`, `ON_HOLD`, `REWORK`

**QC:**
`PENDING`, `PASSED`, `FAILED`, `REWORK`

**Packing:**
`PENDING`, `PACKED`, `REPACK_REQUIRED`

**Shipping:**
`PENDING`, `READY_TO_SHIP`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`

**Return:**
`REQUESTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `RETURNED`, `REFUND_PENDING`, `REFUNDED`

**Refund:**
`PENDING`, `APPROVED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`

Locked payment rules (Phase 2 design MUST enforce):
- UPI screenshot upload moves payment state to `PROOF_SUBMITTED` only — NEVER auto-confirm.
- Only a user with `payment.verify` can transition `UNDER_REVIEW → PAYMENT_CONFIRMED` or `UNDER_REVIEW → PAYMENT_REJECTED`.
- A rejection requires a reason code/note.
- All transitions validated server-side; invalid transitions return controlled API errors.
- Every important transition creates an audit log entry.
- Payment methods are `UPI_MANUAL` and `COD` only; no payment gateway.

These enums are mirrored in `packages/shared` (`@deepa/shared`).

---

## PHASE 0 SCOPE UPDATE REGISTER

- Scope principle changed to **COMPLETE PRODUCT + FREE INITIAL INFRASTRUCTURE + UPGRADEABLE ARCHITECTURE**.
- All "MVP-only / limited MVP scope / future feature excluded" wording removed. BRD/FRD features are in scope; only infrastructure is staged on free tiers. "Initial/future" wording now refers to **deployment or provider-activation timing**, never product exclusion.
- Decisions resolved: staff/RBAC, coupons/offers, guest checkout, UTR optional, WhatsApp abstraction, invoice, shipping config, returns/refunds manual, i18n architecture, and **D3 canonical state model (see U.7)**.
- Decisions still open (require owner approval): D7 (verification + reset channel), D10 (review scale), D9/D11/D12 defaults and values, and small items in U.5.

*End of updated Phase 0 analysis. Awaiting approval before Phase 1 (no code written).*