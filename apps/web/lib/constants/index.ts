export { ROLES, STAFF_ROLES, isStaffRole, PERMISSIONS, ALL_PERMISSIONS } from "@deepa/shared";
export type { Role, Permission } from "@deepa/shared";

/** Backend enums. Values are copied verbatim from the API DTOs; never rename or re-order. */
export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_SORTS = [
  "newest",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
  "featured",
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const OPTION_TYPES = ["COLOR", "SIZE", "HANDLE"] as const;
export type OptionType = (typeof OPTION_TYPES)[number];

export const STOCK_MODES = ["INVENTORY_TRACKED", "AVAILABLE_ONLY"] as const;
export type StockMode = (typeof STOCK_MODES)[number];

export const CMS_PAGE_TYPES = ["PAGE", "POLICY", "CONTACT", "FAQ"] as const;
export type CmsPageType = (typeof CMS_PAGE_TYPES)[number];

export const CMS_PAGE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type CmsPageStatus = (typeof CMS_PAGE_STATUSES)[number];

export const PAGE_ACTIONS = ["publish", "unpublish", "archive"] as const;
export type PageAction = (typeof PAGE_ACTIONS)[number];

export const MEDIA_KINDS = ["IMAGE", "VIDEO", "UNKNOWN"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_BUCKETS = ["PUBLIC", "PRIVATE"] as const;
export type MediaBucket = (typeof MEDIA_BUCKETS)[number];

export const MEDIA_STATUSES = ["AVAILABLE", "PENDING_MODERATION", "REJECTED", "HIDDEN"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const OWNER_TYPES = [
  "PRODUCT",
  "CATEGORY",
  "BANNER",
  "CMS_PAGE",
  "VARIANT",
  "USER",
  "PAYMENT",
] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

export const BANNER_TARGETS = ["PRODUCT", "CATEGORY", "PAGE", "EXTERNAL"] as const;
export type BannerTarget = (typeof BANNER_TARGETS)[number];

export const SEO_ENTITY_TYPES = ["product", "category", "page"] as const;
export type SeoEntityType = (typeof SEO_ENTITY_TYPES)[number];

/** Default catalogue page size used by server-rendered list routes. */
export const PAGE_LIMIT = 20;