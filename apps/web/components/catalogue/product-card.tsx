"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import type { ProductListItem } from "@/lib/types/api";
import { formatINR } from "@/lib/utils/format";

/**
 * Public list responses (Phase 5) intentionally omit media, so cards show an
 * artisanal placeholder tile instead of inventing an image URL.
 */
export function ProductCard({ product }: { product: ProductListItem }) {
  const { localize, t } = useI18n();
  const name = localize(product.name);
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-amber-50 to-stone-100">
        <span className="text-4xl font-semibold text-amber-800/40">{initial}</span>
        {product.featured ? (
          <span className="absolute left-2 top-2 rounded-full bg-amber-700 px-2 py-0.5 text-xs font-medium text-white">
            {t("featured")}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-sm font-semibold leading-snug text-stone-900 group-hover:underline">
          {name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-stone-900">
            {formatINR(product.pricing.effectivePrice)}
          </span>
          {product.pricing.mrp && product.pricing.mrp > product.pricing.effectivePrice ? (
            <span className="text-sm text-stone-400 line-through">
              {formatINR(product.pricing.mrp)}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-stone-500">
          {t("from")} {formatINR(product.pricing.min)} · {t("moq")}:{" "}
          {product.pricing.moq > 1 ? `${product.pricing.moq}` : "1"}
        </p>
      </div>
    </Link>
  );
}