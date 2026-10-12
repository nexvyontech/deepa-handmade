"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n/provider";
import * as products from "@/lib/api/admin";
import { listAllCategories } from "@/lib/api/admin";
import { listAllBanners, listAdminPages } from "@/lib/api/cms";
import { listMedia } from "@/lib/api/media";

interface Counts {
  products: number;
  categories: number;
  banners: number;
  pages: number;
  media: number;
}

const INITIAL: Counts = { products: 0, categories: 0, banners: 0, pages: 0, media: 0 };

export function AdminDashboard() {
  const { t } = useI18n();
  const [counts, setCounts] = useState<Counts>(INITIAL);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    try {
      const [productList, categoryList, bannerList, pageList, mediaList] = await Promise.all([
        products.listProductsAdmin({ status: "ACTIVE", limit: 1 }),
        listAllCategories(),
        listAllBanners(),
        listAdminPages("PUBLISHED"),
        listMedia({ limit: 1 }),
      ]);
      setCounts({
        products: productList.total,
        categories: categoryList.length,
        banners: bannerList.length,
        pages: pageList.length,
        media: mediaList.total,
      });
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (error) return <ErrorState error={error} onRetry={() => void load()} />;

  const cards: Array<{ href: string; label: string; value: number }> = [
    { href: "/admin/products", label: t("statProducts"), value: counts.products },
    { href: "/admin/categories", label: t("statCategories"), value: counts.categories },
    { href: "/admin/cms/banners", label: t("statBanners"), value: counts.banners },
    { href: "/admin/cms/pages", label: t("statPages"), value: counts.pages },
    { href: "/admin/media", label: t("statMedia"), value: counts.media },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card, index) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="text-3xl font-semibold text-stone-900">
              {busy ? "…" : card.value}
            </span>
            <span className="text-sm text-stone-500">{card.label}</span>
            {index === 0 ? (
              <span className="text-xs text-stone-400">(ACTIVE)</span>
            ) : null}
          </Link>
        ))}
      </div>
      <p className="text-sm text-stone-500">{t("dashboardHint")}</p>
    </div>
  );
}