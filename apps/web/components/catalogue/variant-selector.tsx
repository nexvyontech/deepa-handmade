"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import type { OptionType } from "@/lib/constants";
import type { VariantView } from "@/lib/types/api";
import { formatINR } from "@/lib/utils/format";

const TYPE_ORDER: OptionType[] = ["COLOR", "SIZE", "HANDLE"];

const typeLabelKey: Record<OptionType, "colour" | "size" | "handleOption"> = {
  COLOR: "colour",
  SIZE: "size",
  HANDLE: "handleOption",
};

export interface AddToCartPayload {
  variantId?: string;
  qty: number;
}

/**
 * Lets a shopper pick COLOUR / SIZE / HANDLE and, when `onAddToCart` is
 * supplied, add the resolved variant (or a variant-less product) to the cart.
 * Prices come from the variant view; the backend remains authoritative.
 */
export function VariantSelector({
  variants,
  basePrice,
  moq = 1,
  onAddToCart,
}: {
  variants: VariantView[];
  basePrice: number;
  moq?: number;
  onAddToCart?: (payload: AddToCartPayload) => void | Promise<void>;
}) {
  const { localize, t } = useI18n();
  const [selected, setSelected] = useState<Partial<Record<OptionType, string>>>({});
  const [rawQty, setRawQty] = useState(moq);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const minQty = moq > 0 ? moq : 1;
  // Derived so a later MOQ change can never leave the control below the minimum.
  const qty = Math.max(rawQty, minQty);

  const groups = useMemo(() => {
    const byType = new Map<OptionType, VariantView["options"]>([]);
    for (const variant of variants) {
      for (const option of variant.options) {
        const existing = byType.get(option.optionType) ?? [];
        if (!existing.some((item) => item.id === option.id)) {
          existing.push(option);
          byType.set(option.optionType, existing);
        }
      }
    }
    const ordered: Array<{ type: OptionType; options: VariantView["options"] }> = [];
    for (const type of TYPE_ORDER) {
      const options = byType.get(type);
      if (options && options.length > 0) {
        ordered.push({ type, options: [...options].sort((a, b) => a.displayOrder - b.displayOrder) });
      }
    }
    return ordered;
  }, [variants]);

  const activeVariants = useMemo(() => variants.filter((v) => v.active), [variants]);

  const chosenIds = useMemo(
    () => (Object.values(selected).filter(Boolean) as string[]).sort(),
    [selected],
  );

  const exactVariant = useMemo(() => {
    const wanted = chosenIds;
    return (
      activeVariants.find(
        (v) =>
          [...v.optionValueIds].sort().join("|") === wanted.join("|") && wanted.length > 0,
      ) ?? null
    );
  }, [activeVariants, chosenIds]);

  const isFullSelection = chosenIds.length === groups.length && groups.length > 0;
  const prices = useMemo(() => {
    if (activeVariants.length === 0) return null;
    const values = activeVariants.map((v) => v.effectivePrice ?? basePrice + v.priceDelta);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [activeVariants, basePrice]);

  if (groups.length === 0 && !onAddToCart) return null;

  const toggle = (type: OptionType, id: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[type] === id) delete next[type];
      else next[type] = id;
      return next;
    });
  };

  const canAdd = groups.length === 0 ? true : Boolean(exactVariant);

  const handleAdd = async () => {
    if (!onAddToCart || !canAdd || adding) return;
    setAdding(true);
    setAdded(false);
    try {
      await onAddToCart({ variantId: exactVariant?.id, qty });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2500);
    } catch {
      // The owner of onAddToCart surfaces the error message.
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ type, options }) => (
        <fieldset key={type}>
          <legend className="mb-2 text-sm font-medium text-stone-700">
            {t(typeLabelKey[type])}
          </legend>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const active = selected[type] === option.id;
              const baseClass =
                "rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
              if (type === "COLOR" && option.hex) {
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggle(type, option.id)}
                    aria-pressed={active}
                    className={`${baseClass} flex items-center gap-2 ${
                      active ? "border-amber-700 bg-amber-50" : "border-stone-300 bg-white"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: option.hex.startsWith("#") ? option.hex : `#${option.hex}` }}
                      aria-hidden="true"
                    />
                    {localize(option.value)}
                  </button>
                );
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(type, option.id)}
                  aria-pressed={active}
                  className={`${baseClass} ${
                    active ? "border-amber-700 bg-amber-50 text-stone-900" : "border-stone-300 bg-white text-stone-800"
                  }`}
                >
                  {localize(option.value)}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {groups.length > 0 ? (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
          {exactVariant ? (
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-semibold text-stone-900">
                {formatINR(exactVariant.effectivePrice ?? basePrice + exactVariant.priceDelta)}
              </span>
              {exactVariant.variantSku ? (
                <span className="text-xs text-stone-500">
                  {t("sku")}: {exactVariant.variantSku}
                </span>
              ) : null}
            </div>
          ) : isFullSelection ? (
            <p className="text-stone-600">{t("combinationNotAvailable")}</p>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-stone-500">{t("chooseAllOptions")}</span>
              {prices ? (
                <span className="text-lg font-medium text-stone-800">
                  {prices.min === prices.max
                    ? formatINR(prices.min)
                    : `${formatINR(prices.min)} – ${formatINR(prices.max)}`}
                </span>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {onAddToCart ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-stone-300 bg-white">
            <button
              type="button"
              onClick={() => setRawQty(Math.max(minQty, qty - 1))}
              disabled={qty <= minQty}
              aria-label={t("decreaseQty")}
              className="px-3 py-2 text-lg leading-none text-stone-700 disabled:opacity-40"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={minQty}
              value={qty}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                setRawQty(Number.isFinite(parsed) && parsed > minQty ? parsed : minQty);
              }}
              aria-label={t("quantity")}
              className="w-12 border-x border-stone-200 py-2 text-center text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => setRawQty(qty + 1)}
              aria-label={t("increaseQty")}
              className="px-3 py-2 text-lg leading-none text-stone-700"
            >
              +
            </button>
          </div>

          <Button type="button" onClick={() => void handleAdd()} disabled={!canAdd || adding} loading={adding}>
            {adding ? t("addingToCart") : added ? t("addedToCart") : t("addToCart")}
          </Button>

          <span className="text-xs text-stone-500">
            {t("moq")}: {minQty}
          </span>
        </div>
      ) : null}
    </div>
  );
}
