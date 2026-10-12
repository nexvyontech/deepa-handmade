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