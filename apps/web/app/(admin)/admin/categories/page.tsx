import type { Metadata } from "next";
import { AdminCategories } from "@/components/admin/categories";

export const metadata: Metadata = {
  title: "Categories | Deepa Handmade Admin",
  robots: { index: false, follow: false },
};

export default function AdminCategoriesPage() {
  return <AdminCategories />;
}