"use client";

import Link from "next/link";
import { BannerCarousel } from "./banner-carousel";
import { ProductGrid } from "./product-grid";
import { useI18n } from "@/lib/i18n/provider";
import type { BannerView, CategoryView, Paginated, ProductListItem } from "@/lib/types/api";

export function HomeSections({
  banners,
  featured,
  categories,
}: {
  banners: BannerView[];
  featured: Paginated<ProductListItem>;
  categories: CategoryView[];
}) {
  const { t, localize } = useI18n();

  return (
    <div className="flex flex-col gap-12">
      <BannerCarousel banners={banners} />

      <section aria-labelledby="featured-heading" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h2 id="featured-heading" className="text-xl font-semibold text-stone-900">
            {t("featuredProducts")}
          </h2>
          <Link href="/products?featured=true" className="text-sm font-medium text-amber-700 hover:underline">
            {t("browseProducts")}
          </Link>
        </div>
        <ProductGrid products={featured.items.slice(0, 8)} />
      </section>

      {categories.length > 0 ? (
        <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
          <h2 id="categories-heading" className="text-xl font-semibold text-stone-900">
            {t("browseByCategory")}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${encodeURIComponent(category.slug)}`}
                className="rounded-xl border border-stone-200 bg-white px-4 py-5 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-sm font-medium text-stone-800">{localize(category.name)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}