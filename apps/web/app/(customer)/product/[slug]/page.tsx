import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProduct, getPublicProductVariants } from "@/lib/api/catalogue";
import { ProductDetailView } from "@/components/catalogue/product-detail";
import { ApiError } from "@/lib/api/errors";
import { metadataFromSeo } from "@/lib/utils/seo";
import type { ProductDetail } from "@/lib/types/api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const product = await getPublicProduct(slug);
    return metadataFromSeo(product.seo, {
      title: product.name.en ?? product.slug,
      description: product.shortDesc,
    });
  } catch {
    return { title: "Product | Deepa Handmade" };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  let product: ProductDetail;
  try {
    product = await getPublicProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const variants = await getPublicProductVariants(slug);

  return <ProductDetailView product={product} variants={variants} />;
}