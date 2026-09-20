import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
};

export default function ProductsPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
      <p className="text-stone-600">
        The product catalogue will appear here once the storefront is wired to
        the API.
      </p>
    </section>
  );
}