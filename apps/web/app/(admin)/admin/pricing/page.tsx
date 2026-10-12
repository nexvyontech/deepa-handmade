import type { Metadata } from "next";
import { AdminPricing } from "@/components/admin/pricing";

export const metadata: Metadata = {
  title: "Pricing | Deepa Handmade Admin",
  robots: { index: false, follow: false },
};

export default function AdminPricingPage() {
  return <AdminPricing />;
}