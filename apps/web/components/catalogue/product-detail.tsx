"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductGallery } from "./product-gallery";
import { VariantSelector, type AddToCartPayload } from "./variant-selector";
import { Badge } from "@/components/ui/badge";
import { FormFeedback } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n/provider";
import { useCart } from "@/lib/cart/context";
import { messageForError } from "@/lib/api/errors";
import { formatINR } from "@/lib/utils/format";
import type { ProductDetail, VariantView } from "@/lib/types/api";

export function ProductDetailView({
  product,
  variants,
}: {
  product: ProductDetail;
  variants: VariantView[];
}) {
  const { t, localize } = useI18n();
  const { addItem } = useCart();
  const [cartError, setCartError] = useState<string | null>(null);

  const mrp = product.pricing.mrp;
  const effective = product.pricing.effectivePrice;
  const savings = mrp && mrp > effective ? mrp - effective : null;

  const paragraphs = useMemo(() => (product.description ?? "").split(/\n+/).filter(Boolean), [product.description]);

  const handleAddToCart = async ({ variantId, qty }: AddToCartPayload) => {
    setCartError(null);
    try {
      await addItem({ productId: product.id, ...(variantId ? { variantId } : {}), qty });
    } catch (caught) {
      setCartError(messageForError(caught));
      throw caught;
    }
  };

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <ProductGallery images={product.media} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {product.featured ? <Badge tone="amber">{t("featured")}</Badge> : null}
            {product.customizable ? <Badge tone="blue">{t("customizable")}</Badge> : null}
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">{localize(product.name)}</h1>
          <p className="text-sm text-stone-500">
            {t("sku")}: {product.sku}
          </p>
          {product.category ? (
            <Link
              href={`/products?category=${encodeURIComponent(product.category.slug)}`}
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              {localize(product.category.name)}
            </Link>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-stone-900">{formatINR(effective)}</span>
            {mrp && mrp > effective ? <span className="text-lg text-stone-400 line-through">{formatINR(mrp)}</span> : null}
          </div>
          {savings ? (
            <p className="text-sm text-emerald-700">
              {t("youSave")}: {formatINR(savings)}
            </p>
          ) : null}
          <p className="text-sm text-stone-500">
            {t("moq")}: {product.pricing.moq} · {t("from")} {formatINR(product.pricing.min)} –{" "}
            {formatINR(product.pricing.max)}
          </p>
        </div>

        <VariantSelector
          variants={variants}
          basePrice={product.pricing.basePrice}
          moq={product.pricing.moq}
          onAddToCart={handleAddToCart}
        />

        <FormFeedback kind="error">{cartError}</FormFeedback>

        <Link href="/cart" className="text-sm font-medium text-amber-700 hover:underline">
          {t("viewCart")}
        </Link>

        {product.materialText ? (
          <div>
            <h2 className="text-sm font-medium text-stone-700">{t("material")}</h2>
            <p className="text-sm text-stone-600">{localize(product.materialText)}</p>
          </div>
        ) : null}

        {product.dimensions &&
        (product.dimensions.length || product.dimensions.width || product.dimensions.height) ? (
          <dl className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
            {product.dimensions.unit ? (
              <div className="flex items-baseline gap-1.5">
                <dt className="text-stone-500">{t("dimensions")}:</dt>
                <dd className="text-stone-800">
                  {[product.dimensions.length, product.dimensions.width, product.dimensions.height]
                    .filter((d) => d !== undefined)
                    .map((d) => `${d}`)
                    .join(" × ")}{" "}
                  {product.dimensions.unit}
                </dd>
              </div>
            ) : null}
            {product.weightKg ? (
              <div className="flex items-baseline gap-1.5">
                <dt className="text-stone-500">{t("weight")}:</dt>
                <dd className="text-stone-800">{product.weightKg} kg</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {paragraphs.length > 0 ? (
          <div className="flex flex-col gap-2 text-sm text-stone-700">
            <h2 className="font-medium text-stone-700">{t("description")}</h2>
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}