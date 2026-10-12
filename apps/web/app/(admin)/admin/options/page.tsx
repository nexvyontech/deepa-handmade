import type { Metadata } from "next";
import { AdminOptions } from "@/components/admin/variants-options";

export const metadata: Metadata = {
  title: "Option values | Deepa Handmade Admin",
  robots: { index: false, follow: false },
};

export default function AdminOptionsPage() {
  return <AdminOptions />;
}