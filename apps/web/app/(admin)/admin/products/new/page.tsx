import type { Metadata } from "next";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata: Metadata = {
  title: "New product | Deepa Handmade Admin",
  robots: { index: false, follow: false },
};

export default function NewProductPage() {
  return <ProductEditor />;
}