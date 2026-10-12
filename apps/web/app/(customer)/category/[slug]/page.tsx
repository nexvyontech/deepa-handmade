import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicCategory, listPublicProducts } from "@/lib/api/catalogue";
import { CategoryBrowse } from "@/components/catalogue/category-browse";
import { ApiError } from "@/lib/api/errors";
import { metadataFromSeo } from "@/lib/utils/seo";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const category = await getPublicCategory(slug);
    return metadataFromSeo(category.seo, { title: category.name.en, description: category.name.en });
  } catch {
    return { title: "Category | Deepa Handmade" };
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;

  let category;
  try {
    category = await getPublicCategory(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const products = await listPublicProducts({ category: slug, sort: "featured", limit: 20 });
  return <CategoryBrowse category={category} products={products} />;
}