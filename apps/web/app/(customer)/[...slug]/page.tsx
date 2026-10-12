import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPage } from "@/lib/api/catalogue";
import { CmsPageBody } from "@/components/catalogue/cms-page";
import { ApiError } from "@/lib/api/errors";
import { metadataFromSeo } from "@/lib/utils/seo";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const page = await getPublicPage(slug.join("/"));
    return metadataFromSeo(page.seo, { title: page.title.en, description: page.title.en });
  } catch {
    return { title: "Deepa Handmade" };
  }
}

export default async function CmsSlugPage({ params }: PageProps) {
  const { slug } = await params;
  let page: Awaited<ReturnType<typeof getPublicPage>>;
  try {
    page = await getPublicPage(slug.join("/"));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return <CmsPageBody page={page} />;
}