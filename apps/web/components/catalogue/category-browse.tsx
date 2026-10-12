"use client";

import Link from "next/link";
import { ProductGrid } from "./product-grid";
import { useI18n } from "@/lib/i18n/provider";
import type { CategoryView, Paginated, ProductListItem } from "@/lib/types/api";

export function CategoryBrowse({
  category,
  products,
}: {
  category: CategoryView;
  products: Paginated<ProductListItem>;
}) {
  const { t, localize } = useI18n();

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-stone-900">{localize(category.name)}</h1>
        <p className="text-sm text-stone-500">
          {products.total} {t("productsInCategory")}
        </p>
      </div>

      <ProductGrid products={products.items} />

      <Link
        href={`/products?category=${encodeURIComponent(category.slug)}`}
        className="self-center text-sm font-medium text-amber-700 hover:underline"
      >
        {t("browseProducts")} →
      </Link>
    </section>
  );
}