"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScreenHeader, AdminTable } from "./screen-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, FormFeedback } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAsyncMutation } from "./use-async-mutation";
import { useI18n } from "@/lib/i18n/provider";
import * as productsApi from "@/lib/api/admin";
import * as api from "@/lib/api/variants";
import { OPTION_TYPES, STOCK_MODES, type OptionType, type StockMode } from "@/lib/constants";
import type { ProductListItem, VariantOptionView, VariantView } from "@/lib/types/api";
import { formatINR } from "@/lib/utils/format";

const TYPE_LABEL_KEY: Record<OptionType, "colourOption" | "sizeOption" | "handleOption"> = {
  COLOR: "colourOption",
  SIZE: "sizeOption",
  HANDLE: "handleOption",
};

export function AdminVariants() {
  const { t, localize } = useI18n();
  const mutation = useAsyncMutation();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productId, setProductId] = useState("");
  const [variants, setVariants] = useState<VariantView[]>([]);
  const [options, setOptions] = useState<VariantOptionView[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VariantView | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [variantSku, setVariantSku] = useState("");
  const [priceDelta, setPriceDelta] = useState("0");
  const [stockMode, setStockMode] = useState<StockMode>("AVAILABLE_ONLY");
  const [active, setActive] = useState(true);
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [deleting, setDeleting] = useState<VariantView | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const result = await productsApi.listProductsAdmin({ limit: 100 });
      setProducts(result.items);
      const url = new URL(window.location.href);
      const prefill = url.searchParams.get("productId");
      if (prefill && result.items.some((p) => p.id === prefill)) setProductId(prefill);
    } catch (caught) {
      setError(caught);
    }
  }, []);

  const loadVariants = useCallback(async (productIdToLoad: string) => {
    try {
      const [variantsList, optionsList] = await Promise.all([
        api.listVariants({ productId: productIdToLoad }),
        api.listOptions(),
      ]);
      setVariants(variantsList);
      setOptions(optionsList);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadProducts());
  }, [loadProducts]);

  useEffect(() => {
    if (productId) queueMicrotask(() => void loadVariants(productId));
  }, [productId, loadVariants]);

  const optionById = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const startCreate = () => {
    setEditing(null);
    setSelectedOptionIds([]);
    setVariantSku("");
    setPriceDelta("0");
    setStockMode("AVAILABLE_ONLY");
    setActive(true);
    setIsCustomColor(false);
    setIsCustomSize(false);
    setShowForm(true);
  };

  const startEdit = (variant: VariantView) => {
    setEditing(variant);
    setSelectedOptionIds([...variant.optionValueIds]);
    setVariantSku(variant.variantSku ?? "");
    setPriceDelta(String(variant.priceDelta));
    setStockMode(variant.stockMode);
    setActive(variant.active);
    setIsCustomColor(variant.isCustomColor);
    setIsCustomSize(variant.isCustomSize);
    setShowForm(true);
  };

  const toggleOption = (id: string) => {
    setSelectedOptionIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  const save = async () => {
    if (!productId) return;
    const ok = await mutation.run(async () => {
      const input = {
        optionValueIds: selectedOptionIds,
        variantSku: variantSku.trim() || undefined,
        priceDelta: Number(priceDelta) || 0,
        stockMode,
        active,
        isCustomColor,
        isCustomSize,
      };
      if (editing) await api.updateVariant(editing.id, input);
      else await api.createVariant({ ...input, productId });
    }, t("saveSuccess"));
    if (ok) {
      setShowForm(false);
      await loadVariants(productId);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const ok = await mutation.run(() => api.deleteVariant(deleting.id), t("saveSuccess"));
    if (ok) {
      setDeleting(null);
      await loadVariants(productId);
    }
  };

  const comboLabel = (variant: VariantView) =>
    variant.optionValueIds
      .map((id) => (optionById.get(id) ? localize(optionById.get(id)!.value) : id))
      .join(" + ");

  const groupedOptions = useMemo(() => {
    const byType = new Map<OptionType, VariantOptionView[]>();
    for (const option of options.filter((o) => o.active)) {
      const list = byType.get(option.optionType) ?? [];
      list.push(option);
      byType.set(option.optionType, list);
    }
    return OPTION_TYPES.filter((type) => (byType.get(type)?.length ?? 0) > 0).map((type) => ({
      type,
      items: byType.get(type)!,
    }));
  }, [options]);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title={t("variants")} />

      <div className="w-full max-w-md">
        <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">{t("chooseProductOption")}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {localize(p.name)} — {p.sku}
            </option>
          ))}
        </Select>
      </div>

      {productId ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">
              {variants.length} {t("variantsOfProduct")}
            </p>
            {groupedOptions.length > 0 ? (
              <Button onClick={startCreate} disabled={busy}>
                {t("newVariant")}
              </Button>
            ) : (
              <p className="text-sm text-stone-500">{t("manageOptions")}</p>
            )}
          </div>

          {error ? <ErrorState error={error} onRetry={() => void loadVariants(productId)} /> : null}

          {!error && variants.length === 0 ? (
            <EmptyState title={t("noVariants")} />
          ) : (
            <AdminTable
              head={[t("optionValues"), t("variationSku"), t("priceDelta"), t("productPricing"), t("stockMode"), t("status"), t("actions")]}
            >
              {variants.map((variant) => (
                <tr key={variant.id}>
                  <td className="px-4 py-3 font-medium text-stone-900">{comboLabel(variant) || "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{variant.variantSku ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{variant.priceDelta}</td>
                  <td className="px-4 py-3 text-stone-600">{formatINR(variant.effectivePrice)}</td>
                  <td className="px-4 py-3 text-xs text-stone-600">{variant.stockMode}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={variant.active ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(variant)}>
                        {t("edit")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(variant)}>
                        {t("delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </>
      ) : (
        <EmptyState title={t("selectProductForPricing")} />
      )}

      {showForm ? (
        <form
          className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="flex flex-col gap-3">
            {groupedOptions.length === 0 ? (
              <p className="text-sm text-stone-500">{t("noVariantsAtAll")}</p>
            ) : (
              groupedOptions.map(({ type, items }) => (
                <fieldset key={type}>
                  <legend className="mb-2 text-sm font-medium text-stone-700">{t(TYPE_LABEL_KEY[type])}</legend>
                  <div className="flex flex-wrap gap-2">
                    {items.map((option) => {
                      const chosen = selectedOptionIds.includes(option.id);
                      const baseClass =
                        "rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed";
                      if (type === "COLOR" && option.hex) {
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleOption(option.id)}
                            aria-pressed={chosen}
                            className={`${baseClass} flex items-center gap-2 ${
                              chosen ? "border-amber-700 bg-amber-50" : "border-stone-300 bg-white"
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
                          onClick={() => toggleOption(option.id)}
                          aria-pressed={chosen}
                          className={`${baseClass} ${
                            chosen ? "border-amber-700 bg-amber-50 text-stone-900" : "border-stone-300 bg-white text-stone-800"
                          }`}
                        >
                          {localize(option.value)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("variationSku")} htmlFor="v-sku">
              <Input id="v-sku" value={variantSku} onChange={(e) => setVariantSku(e.target.value)} />
            </Field>
            <Field label={t("priceDelta")} htmlFor="v-delta">
              <Input id="v-delta" type="number" step="any" value={priceDelta} onChange={(e) => setPriceDelta(e.target.value)} />
            </Field>
            <Field label={t("stockMode")} htmlFor="v-stock">
              <Select id="v-stock" value={stockMode} onChange={(e) => setStockMode(e.target.value as StockMode)}>
                {STOCK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-col gap-1 pt-5 text-sm text-stone-800">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-amber-700" />
                {t("active")}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isCustomColor} onChange={(e) => setIsCustomColor(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-amber-700" />
                {t("colourOption")}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isCustomSize} onChange={(e) => setIsCustomSize(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-amber-700" />
                {t("sizeOption")}
              </label>
            </div>
          </div>

          <FormFeedback kind="error">{mutation.error}</FormFeedback>
          <FormFeedback kind="success">{mutation.success}</FormFeedback>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={mutation.busy} disabled={selectedOptionIds.length === 0}>
              {t("save")}
            </Button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("confirmDeleteCategory")}
        message={deleting ? comboLabel(deleting) : ""}
        busy={mutation.busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}