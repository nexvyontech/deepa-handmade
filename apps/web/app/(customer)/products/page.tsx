import type { Metadata } from "next";
import { listPublicCategories, listPublicProducts } from "@/lib/api/catalogue";
import { ProductListing, type ListingQuery } from "@/components/catalogue/product-listing";
import { PAGE_LIMIT, PRODUCT_SORTS, type ProductSort } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products | Deepa Handmade",
  description: "Browse handcrafted wire kudai and baskets.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : undefined;
}

function toNonNegative(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawSort = first(params.sort);
  const sort: ProductSort | undefined = (PRODUCT_SORTS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as ProductSort)
    : undefined;
  const featured = first(params.featured) === "true";

  const query: ListingQuery = {
    q: first(params.q),
    category: first(params.category),
    sort,
    page: toInt(first(params.page)),
    priceMin: toNonNegative(first(params.priceMin)),
    priceMax: toNonNegative(first(params.priceMax)),
    ...(featured ? { featured: true } : {}),
  };

  const [result, categories] = await Promise.all([
    listPublicProducts({ ...query, limit: PAGE_LIMIT }),
    listPublicCategories(),
  ]);

  return <ProductListing query={query} result={result} categories={categories} />;
}