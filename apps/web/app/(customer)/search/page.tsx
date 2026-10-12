import type { Metadata } from "next";
import { listPublicProducts } from "@/lib/api/catalogue";
import { ProductListing } from "@/components/catalogue/product-listing";
import { PAGE_LIMIT } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  return {
    title: q ? `Search: ${q} | Deepa Handmade` : "Search | Deepa Handmade",
    description: "Search results",
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;

  const result = await listPublicProducts({ q: q || undefined, limit: PAGE_LIMIT });

  return <ProductListing query={{ q }} result={result} categories={[]} searchMode />;
}