import type { Metadata } from "next";
import { AdminProductsList } from "@/components/admin/products-list";

export const metadata: Metadata = {
  title: "Products | Deepa Handmade Admin",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return <AdminProductsList />;
}