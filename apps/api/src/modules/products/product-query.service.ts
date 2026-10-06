import { ProductStatus } from './dto/product.dto.js';

/** Escape user input for use inside a case-insensitive RegExp. */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type ProductSortKey = 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'featured';

export interface ProductSortSpec {
  [key: string]: 1 | -1;
}

const PRODUCT_SORTS: Record<ProductSortKey, ProductSortSpec> = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { basePrice: 1, _id: 1 },
  price_desc: { basePrice: -1, _id: 1 },
  name_asc: { 'name.en': 1, _id: 1 },
  name_desc: { 'name.en': -1, _id: 1 },
  featured: { featured: -1, createdAt: -1, _id: -1 },
};

export function sortFor(key: ProductSortKey): ProductSortSpec {
  return PRODUCT_SORTS[key] ?? PRODUCT_SORTS.newest;
}

export interface ProductQueryShape {
  status: ProductStatus;
  searchText?: { $regex: string; $options: 'i' };
  categoryId?: { $in: string[] };
  _id?: { $in: string[] };
  basePrice?: { $gte?: number; $lte?: number };
  featured?: boolean;
}

export function productListQuery(
  base: {
    status: ProductStatus;
    search?: string;
    categoryIds?: string[];
    productIds?: string[];
    priceMin?: number;
    priceMax?: number;
    featured?: boolean;
  },
): ProductQueryShape {
  const filter: ProductQueryShape = {
    status: base.status,
  };

  if (base.search) {
    filter.searchText = { $regex: escapeRegExp(base.search), $options: 'i' };
  }
  if (base.categoryIds && base.categoryIds.length > 0) {
    filter.categoryId = { $in: base.categoryIds };
  }
  if (base.productIds && base.productIds.length > 0) {
    filter._id = { $in: base.productIds };
  }
  if (base.priceMin !== undefined || base.priceMax !== undefined) {
    const price: ProductQueryShape['basePrice'] = {};
    if (base.priceMin !== undefined) price.$gte = base.priceMin;
    if (base.priceMax !== undefined) price.$lte = base.priceMax;
    filter.basePrice = price;
  }
  if (base.featured !== undefined) filter.featured = base.featured;

  return filter;
}

export function paginationMeta(total: number, page: number, limit: number): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 1 : Math.ceil(total / limit),
  };
}