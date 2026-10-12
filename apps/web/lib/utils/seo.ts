import type { Metadata } from "next";
import type { SeoBlock } from "@/lib/types/api";
import { resolveMediaUrl } from "@/lib/env";

/**
 * Turn a backend SEO block into Next.js <head> metadata. Field names mirror the
 * API's SeoDto exactly (the noindex flag, not "robotsNoIndex").
 */
export function metadataFromSeo(
  seo: SeoBlock | undefined | null,
  fallback: { title?: string; description?: string },
): Metadata {
  if (!seo) {
    return {
      title: fallback.title,
      description: fallback.description,
      robots: { index: true, follow: true },
    };
  }

  const title = seo.title || fallback.title;
  const description = seo.metaDescription || fallback.description;

  const openGraph: Metadata["openGraph"] = {
    title: seo.ogTitle || title,
    description: seo.ogDescription || description,
  };
  if (seo.ogImageMediaId) {
    openGraph.images = [resolveMediaUrl(`/media/${seo.ogImageMediaId}/content`)];
  }

  return {
    title,
    description,
    robots: seo.noindex ? { index: false, follow: true } : { index: true, follow: true },
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    openGraph,
  };
}