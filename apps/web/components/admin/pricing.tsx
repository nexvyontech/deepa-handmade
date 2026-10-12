"use client";

import { useCallback, useEffect, useState } from "react";
import { ScreenHeader } from "./screen-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ErrorState, FormFeedback } from "@/components/ui/feedback";
import { useAsyncMutation } from "./use-async-mutation";
import { useI18n } from "@/lib/i18n/provider";
import * as productsApi from "@/lib/api/admin";
import { updateProductPricing } from "@/lib/api/pricing";
import type { ProductListItem } from "@/lib/types/api";
import { formatINR } from "@/lib/utils/format";

export function AdminPricing() {
  const { t, localize } = useI18n();
  const mutation = useAsyncMutation();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productId, setProductId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [moq, setMoq] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await productsApi.listProductsAdmin({ limit: 100 });
      setProducts(result.items);
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

  const selectProduct = (id: string) => {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    if (product) {
      setBasePrice(String(product.pricing.basePrice ?? ""));
      setMrp(product.pricing.mrp !== undefined ? String(product.pricing.mrp) : "");
      setMoq(String(product.pricing.moq ?? ""));
    }
  };

  const save = async () => {
    if (!productId) return;
    const ok = await mutation.run(async () => {
      const body: { basePrice?: number; mrp?: number; moq?: number } = {};
      if (basePrice !== "") body.basePrice = Number(basePrice);
      if (mrp !== "") body.mrp = Number(mrp);
      if (moq !== "") body.moq = Number(moq);
      await updateProductPricing(productId, body);
    }, t("pricingUpdated"));
    if (ok) await load();
  };

  const selected = products.find((p) => p.id === productId);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title={t("productPricingTitle")} description={t("selectProductForPricing")} />

      {error ? <ErrorState error={error} onRetry={() => void load()} /> : null}

      <div className="w-full max-w-md">
        <Select value={productId} onChange={(e) => selectProduct(e.target.value)} disabled={busy}>
          <option value="">{t("chooseProductOption")}</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {localize(product.name)} — {formatINR(product.pricing.min)}
            </option>
          ))}
        </Select>
      </div>

      {selected ? (
        <form
          className="flex max-w-lg flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("basePrice")} htmlFor="pr-base" required>
              <Input id="pr-base" type="number" min={0} step="any" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
            </Field>
            <Field label={t("mrpField")} htmlFor="pr-mrp">
              <Input id="pr-mrp" type="number" min={0} step="any" value={mrp} onChange={(e) => setMrp(e.target.value)} />
            </Field>
            <Field label={t("moq")} htmlFor="pr-moq">
              <Input id="pr-moq" type="number" min={1} value={moq} onChange={(e) => setMoq(e.target.value)} />
            </Field>
          </div>

          <p className="text-sm text-stone-500">
            {t("from")} {formatINR(selected.pricing.min)} – {formatINR(selected.pricing.max)} ·{" "}
            {t("moq")}: {selected.pricing.moq}
          </p>

          <FormFeedback kind="error">{mutation.error}</FormFeedback>
          <FormFeedback kind="success">{mutation.success}</FormFeedback>

          <div className="flex justify-end">
            <Button type="submit" loading={mutation.busy} disabled={basePrice === ""}>
              {t("updatePrices")}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-stone-500">{t("chooseProductOption")}</p>
      )}
    </div>
  );
}