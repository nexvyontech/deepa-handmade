"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { EmptyState } from "@/components/ui/feedback";
import type { CategoryView } from "@/lib/types/api";

export function CategoryList({ categories }: { categories: CategoryView[] }) {
  const { t, localize } = useI18n();

  if (categories.length === 0) {
    return <EmptyState title={t("noCategories")} message={t("noCategoriesMessage")} />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/products?category=${encodeURIComponent(category.slug)}`}
          className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <span className="font-medium text-stone-800">{localize(category.name)}</span>
        </Link>
      ))}
    </div>
  );
}