import type { Metadata } from "next";
import { listActiveBanners, listPublicCategories, listPublicProducts } from "@/lib/api/catalogue";
import { HomeSections } from "@/components/catalogue/home-sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deepa Handmade | Authentic Wire Kudais",
  description:
    "Handcrafted wire kudai and handmade baskets, woven in Tamil Nadu and delivered across India.",
};

export default async function CustomerHomePage() {
  const [banners, featured, categories] = await Promise.all([
    listActiveBanners(),
    listPublicProducts({ featured: true, sort: "featured", limit: 8 }),
    listPublicCategories(),
  ]);

  return <HomeSections banners={banners} featured={featured} categories={categories} />;
}