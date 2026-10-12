import type {
  BannerTarget,
  CmsPageStatus,
  CmsPageType,
  MediaBucket,
  MediaKind,
  MediaStatus,
  OptionType,
  OwnerType,
  ProductStatus,
  StockMode,
} from "@/lib/constants";

export interface LocalizedText {
  en: string;
  ta?: string;
}

/** SEO block. Field names must match the backend SeoDto (note: `noindex`, not `robotsNoIndex`). */
export interface SeoBlock {
  title?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  ogImageMediaId?: string;
  noindex?: boolean;
}

export interface MediaRef {
  id: string;
  url: string;
  alt?: { en?: string; ta?: string };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DISABLED" | "PENDING_VERIFICATION";

export interface PublicUser {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  role: string;
  permissions: string[];
  status: UserStatus;
  lastLoginAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: PublicUser;
}

export interface CategoryView {
  id: string;
  name: LocalizedText;
  slug: string;
  parentId?: string;
  imageMediaId?: string;
  bannerMediaId?: string;
  image?: { id: string; url: string };
  banner?: { id: string; url: string };
  active: boolean;
  sortOrder: number;
  seo?: SeoBlock;
  createdAt?: string;
}

export interface ProductPricing {
  basePrice: number;
  mrp?: number;
  moq: number;
  effectivePrice: number;
  min: number;
  max: number;
}

export interface RatingSummary {
  average: number;
  count: number;
}

export interface ProductListItem {
  id: string;
  name: LocalizedText;
  slug: string;
  sku: string;
  shortDesc?: string;
  categoryId?: string;
  pricing: ProductPricing;
  featured: boolean;
  customizable: boolean;
  tags?: string[];
  ratingSummary: RatingSummary;
  status?: ProductStatus;
  searchText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductDetail extends ProductListItem {
  description?: string;
  weightKg?: number;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  materialText?: LocalizedText;
  seo?: SeoBlock;
  category?: { id: string; slug: string; name: LocalizedText } | null;
  media: MediaRef[];
  variants: Array<{ id: string; optionValueIds: string[] }>;
  createdBy?: string;
  updatedBy?: string;
}

export interface VariantOptionView {
  id: string;
  optionType: OptionType;
  value: LocalizedText;
  hex?: string;
  displayOrder: number;
  active: boolean;
  createdAt?: string;
}

export interface VariantView {
  id: string;
  productId: string;
  optionValueIds: string[];
  options: VariantOptionView[];
  comboHash: string;
  variantSku?: string;
  priceDelta: number;
  effectivePrice?: number;
  stockMode: StockMode;
  active: boolean;
  imageMediaIds: string[];
  images: Array<{ id: string; url: string }>;
  isCustomColor: boolean;
  isCustomSize: boolean;
  createdAt?: string;
}

export interface MediaView {
  id: string;
  ownerType: OwnerType | string;
  ownerId: string;
  kind: MediaKind;
  bucket: MediaBucket;
  mime: string;
  sizeBytes: number;
  status: MediaStatus;
  isPrimary: boolean;
  sortOrder: number;
  uploadedBy?: string;
  createdAt?: string;
  /** Localized alt text for accessibility. */
  alt?: LocalizedText;
  /** Relative URL served by the API — resolve with resolveMediaUrl(). */
  url?: string;
}

export interface CmsPageView {
  id: string;
  slug: string;
  type: CmsPageType;
  title: LocalizedText;
  content?: LocalizedText;
  seo?: SeoBlock;
  status: CmsPageStatus;
  publishedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BannerView {
  id: string;
  title?: LocalizedText;
  image?: { id: string; url: string };
  ctaUrl?: string;
  ctaLabel?: LocalizedText;
  target?: BannerTarget;
  location?: string;
  sortOrder: number;
  active: boolean;
  startAt?: string;
  endAt?: string;
}

export interface SeoView {
  entityType: "product" | "category" | "page";
  entityId: string;
  seo: SeoBlock | null;
}

export interface AdminPricing {
  id: string;
  basePrice: number;
  mrp?: number;
  moq: number;
}

// ---------------------------------------------------------------------------
// Phase 7 — cart, addresses and checkout
// ---------------------------------------------------------------------------

export type CartIdentityKind = "GUEST" | "CUSTOMER";
export type ShippingMethod = "FLAT_FREE_THRESHOLD";
export type CartShippingStatus = "CONFIGURED" | "UNAVAILABLE";

export interface CartOption {
  optionType: string;
  value: LocalizedText;
  hex?: string;
}

export interface CartCustomDetails {
  colorText?: string;
  sizeText?: string;
  handleText?: string;
  notes?: string;
}

export interface CartItemView {
  id: string;
  productId: string;
  productName: LocalizedText | null;
  productSlug: string | null;
  productSku: string | null;
  variantId?: string;
  variantSku?: string;
  options: CartOption[];
  customDetails?: CartCustomDetails;
  qty: number;
  moq: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartTotalsView {
  subtotal: number;
  discount: number;
  shipping: number;
  grandTotal: number;
  shippingStatus: CartShippingStatus;
  shippingMethod: ShippingMethod;
}

export interface CartView {
  id: string;
  identity: CartIdentityKind;
  items: CartItemView[];
  totals: CartTotalsView;
  couponCode: string | null;
  offerAppliedIds: string[];
  version: number;
  updatedAt?: string;
}

export type CartIssueCode = "ITEM_UNAVAILABLE" | "PRICE_CHANGED" | "QUANTITY_BELOW_MOQ" | "CART_EMPTY";

export interface CartIssue {
  code: CartIssueCode;
  itemId?: string;
  message: string;
}

export interface CartValidationResult {
  cart: CartView;
  issues: CartIssue[];
}

export interface AddressView {
  id: string;
  recipient: string;
  mobile: string;
  line1: string;
  line2?: string;
  villageTown: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
  label?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutInlineAddress {
  recipient: string;
  mobile: string;
  line1: string;
  line2?: string;
  villageTown: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
  label?: string;
}

export interface CheckoutAddressSnapshot extends CheckoutInlineAddress {
  addressId?: string;
}

export interface ShippingQuote {
  method: ShippingMethod;
  shipping: number;
  flatFee?: number;
  freeThreshold?: number;
}

export interface CheckoutOrderSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  grandTotal: number;
}

export interface CheckoutPreparation {
  valid: boolean;
  issues: CartIssue[];
  cart: CartView;
  address: CheckoutAddressSnapshot;
  shipping: ShippingQuote;
  summary: CheckoutOrderSummary;
}

export interface CheckoutPrepareInput {
  addressId?: string;
  address?: CheckoutInlineAddress;
}