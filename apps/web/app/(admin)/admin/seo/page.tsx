import type { Metadata } from "next";
import { AdminSeo } from "@/components/admin/seo";

export const metadata: Metadata = {
  title: "SEO | Deepa Handmade Admin",
  robots: { index: false, follow: false },
};

export default function AdminSeoPage() {
  return <AdminSeo />;
}