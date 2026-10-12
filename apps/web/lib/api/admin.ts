import { apiRequest } from "./request";
import type { QueryParams } from "./request";
import type { CategoryView, Paginated, ProductDetail, ProductListItem } from "@/lib/types/api";
import type { ProductStatus, ProductSort } from "@/lib/constants";

export interface LocalizedTextInput {
  en: string;
  ta?: string;
}

export interface SeoInput {
  title?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  ogImageMediaId?: string;
  noindex?: boolean;
}

export interface DimensionsInput {
  length?: number;
  width?: number;
  height?: number;
  unit?: string;
}

// ------------------------------------------------------------------ categories

export interface CategoryCreateInput {
  name: LocalizedTextInput;
  slug?: string;
  parentId?: string;
  imageMediaId?: string;
  bannerMediaId?: string;
  sortOrder?: number;
  seo?: SeoInput;
}

export interface CategoryUpdateInput {
  name?: LocalizedTextInput;
  slug?: string;
  parentId?: string;
  imageMediaId?: string;
  bannerMediaId?: string;
  active?: boolean;
  sortOrder?: number;
  seo?: SeoInput;
}

/** GET /admin/categories — full flat list (active and inactive). */
export function listAllCategories(): Promise<CategoryView[]> {
  return apiRequest<CategoryView[]>({ path: "/admin/categories" });
}

export function getCategory(id: string): Promise<CategoryView> {
  return apiRequest<CategoryView>({ path: `/admin/categories/${id}` });
}

export function createCategory(input: CategoryCreateInput): Promise<CategoryView> {
  return apiRequest<CategoryView>({ method: "POST", path: "/admin/categories", body: input });
}

export function updateCategory(id: string, input: CategoryUpdateInput): Promise<CategoryView> {
  return apiRequest<CategoryView>({ method: "PATCH", path: `/admin/categories/${id}`, body: input });
}

/** Soft-deactivate a category (DELETE /admin/categories/:id). */
export function deleteCategory(id: string): Promise<CategoryView> {
  return apiRequest<CategoryView>({ method: "DELETE", path: `/admin/categories/${id}` });
}

// -------------------------------------------------------------------- products

export interface ProductCreateInput {
  name: LocalizedTextInput;
  slug?: string;
  sku: string;
  shortDesc?: string;
  description?: string;
  categoryId?: string;
  /** Price fields only exist on CREATE — updates go through the pricing module. */
  basePrice: number;
  mrp?: number;
  moq?: number;
  weightKg?: number;
  dimensions?: DimensionsInput;
  materialText?: LocalizedTextInput;
  tags?: string[];
  status?: ProductStatus;
  featured?: boolean;
  customizable?: boolean;
  seo?: SeoInput;
}

export interface ProductUpdateInput {
  name?: LocalizedTextInput;
  slug?: string;
  sku?: string;
  shortDesc?: string;
  description?: string;
  categoryId?: string;
  weightKg?: number;
  dimensions?: DimensionsInput;
  materialText?: LocalizedTextInput;
  tags?: string[];
  status?: ProductStatus;
  featured?: boolean;
  customizable?: boolean;
  seo?: SeoInput;
}

export interface AdminProductQuery extends QueryParams {
  q?: string;
  status?: ProductStatus;
  categoryId?: string;
  featured?: boolean;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

/**
 * GET /admin/products.
 * NOTE: the backend has no default and filters to `DRAFT` when `status` is
 * omitted. Callers should pass an explicit status ("ACTIVE" covers the public
 * catalogue) — the default of this helper is "ACTIVE", never an implicit DRAFT.
 */
export function listProductsAdmin(query: AdminProductQuery): Promise<Paginated<ProductListItem>> {
  return apiRequest<Paginated<ProductListItem>>({
    path: "/admin/products",
    query: { ...query, status: query.status ?? "ACTIVE" },
  });
}

export function createProduct(input: ProductCreateInput): Promise<ProductListItem> {
  return apiRequest<ProductListItem>({ method: "POST", path: "/admin/products", body: input });
}

export function getProduct(id: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>({ path: `/admin/products/${id}` });
}

/** PATCH /admin/products/:id — never contains price fields (pricing is separate). */
export function updateProduct(id: string, input: ProductUpdateInput): Promise<ProductListItem> {
  return apiRequest<ProductListItem>({ method: "PATCH", path: `/admin/products/${id}`, body: input });
}

/** Soft-archive a product (DELETE /admin/products/:id). */
export function deleteProduct(id: string): Promise<ProductListItem> {
  return apiRequest<ProductListItem>({ method: "DELETE", path: `/admin/products/${id}` });
}