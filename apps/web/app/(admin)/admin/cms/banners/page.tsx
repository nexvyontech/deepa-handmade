import type { Metadata } from "next";
import { AdminBanners } from "@/components/admin/banners";

export const metadata: Metadata = {
  title: "Banners | Deepa Handmade Admin",
  robots: { index: false, follow: false },
};

export default function AdminBannersPage() {
  return <AdminBanners />;
}