import type { Metadata } from "next";
import { AdminCmsPages } from "@/components/admin/cms-pages";

export const metadata: Metadata = {
  title: "CMS pages | Deepa Handmade Admin",
  robots: { index: false, follow: false },
};

export default function AdminCmsPagesPage() {
  return <AdminCmsPages />;
}