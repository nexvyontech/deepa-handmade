import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminDashboardPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-stone-600">
        Admin modules (orders, products, inventory, production, QC, packing,
        shipping, reports, settings) will be built in later phases.
      </p>
    </section>
  );
}