import { apiRequest } from "./request";
import type { QueryParams } from "./request";
import type {
  BannerView,
  CategoryView,
  CmsPageView,
  Paginated,
  ProductDetail,
  ProductListItem,
  VariantView,
} from "@/lib/types/api";
import type { ProductSort } from "@/lib/constants";

export interface PublicProductQuery extends QueryParams {
  q?: string;
  /** Category slug (public listing expands to descendant categories). */
  category?: string;
  color?: string;
  size?: string;
  handle?: string;
  priceMin?: number;
  priceMax?: number;
  featured?: boolean;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

/** GET /catalog/categories — active top-level categories (flat list). */
export function listPublicCategories(): Promise<CategoryView[]> {
  return apiRequest<CategoryView[]>({ path: "/catalog/categories", auth: "none" });
}

/** GET /catalog/categories/:slug */
export function getPublicCategory(slug: string): Promise<CategoryView> {
  return apiRequest<CategoryView>({ path: `/catalog/categories/${encodeURIComponent(slug)}`, auth: "none" });
}

/** GET /catalog/products */
export function listPublicProducts(query: PublicProductQuery): Promise<Paginated<ProductListItem>> {
  return apiRequest<Paginated<ProductListItem>>({ path: "/catalog/products", query, auth: "none" });
}

/** GET /catalog/products/:slug */
export function getPublicProduct(slug: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>({ path: `/catalog/products/${encodeURIComponent(slug)}`, auth: "none" });
}

/** GET /catalog/products/:slug/variants */
export function getPublicProductVariants(slug: string): Promise<VariantView[]> {
  return apiRequest<VariantView[]>({ path: `/catalog/products/${encodeURIComponent(slug)}/variants`, auth: "none" });
}

/** GET /cms/pages — published pages only. */
export function listPublicPages(): Promise<CmsPageView[]> {
  return apiRequest<CmsPageView[]>({ path: "/cms/pages", auth: "none" });
}

/** GET /cms/pages/:slug — published page by slug. */
export function getPublicPage(slug: string): Promise<CmsPageView> {
  return apiRequest<CmsPageView>({ path: `/cms/pages/${encodeURIComponent(slug)}`, auth: "none" });
}

/** GET /cms/banners — currently active banners within their date window. */
export function listActiveBanners(): Promise<BannerView[]> {
  return apiRequest<BannerView[]>({ path: "/cms/banners", auth: "none" });
}