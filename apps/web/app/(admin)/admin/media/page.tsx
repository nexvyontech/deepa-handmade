import type { Metadata } from "next";
import { AdminMedia } from "@/components/admin/media";

export const metadata: Metadata = {
  title: "Media | Deepa Handmade Admin",
  robots: { index: false, follow: false },
};

export default function AdminMediaPage() {
  return <AdminMedia />;
}