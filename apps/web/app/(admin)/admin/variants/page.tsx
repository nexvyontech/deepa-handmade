import type { Metadata } from "next";
import { AdminVariants } from "@/components/admin/variants";

export const metadata: Metadata = {
  title: "Variants | Deepa Handmade Admin",
  robots: { index: false, follow: false },
};

export default function AdminVariantsPage() {
  return <AdminVariants />;
}