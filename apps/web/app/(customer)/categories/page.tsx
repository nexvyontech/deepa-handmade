import type { Metadata } from "next";
import { listPublicCategories } from "@/lib/api/catalogue";
import { CategoryList } from "@/components/catalogue/category-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories | Deepa Handmade",
  description: "Browse handmade products by category.",
};

export default async function CategoriesPage() {
  const categories = await listPublicCategories();
  return <CategoryList categories={categories} />;
}