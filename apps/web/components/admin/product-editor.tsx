"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState, FormFeedback } from "@/components/ui/feedback";
import { SeoFields } from "./seo-fields";
import { useAsyncMutation } from "./use-async-mutation";
import { useI18n } from "@/lib/i18n/provider";
import * as api from "@/lib/api/admin";
import { updateProductPricing } from "@/lib/api/pricing";
import { listProductMedia, setProductMediaOrder, detachProductMedia, uploadMedia } from "@/lib/api/media";
import { resolveMediaUrl } from "@/lib/env";
import { slugify } from "@/lib/utils/format";
import { PRODUCT_STATUSES, type ProductStatus } from "@/lib/constants";
import type { MediaView, ProductDetail } from "@/lib/types/api";

interface FormState {
  nameEn: string;
  nameTa: string;
  slug: string;
  sku: string;
  categoryId?: string;
  shortDesc: string;
  description: string;
  materialEn: string;
  materialTa: string;
  weightKg?: number;
  length?: number;
  width?: number;
  height?: number;
  unit: string;
  tags: string;
  status: ProductStatus;
  featured: boolean;
  customizable: boolean;
  seoMode: boolean;
}

const EMPTY: FormState = {
  nameEn: "",
  nameTa: "",
  slug: "",
  sku: "",
  shortDesc: "",
  description: "",
  materialEn: "",
  materialTa: "",
  unit: "cm",
  tags: "",
  status: "DRAFT",
  featured: true,
  customizable: true,
  seoMode: false,
};

export function ProductEditor({ productId }: { productId?: string }) {
  const { t, localize } = useI18n();
  const router = useRouter();
  const mutation = useAsyncMutation();

  const [categories, setCategories] = useState<Awaited<ReturnType<typeof api.listAllCategories>>>([]);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [media, setMedia] = useState<MediaView[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [seo, setSeo] = useState<api.SeoInput>({});
  const [basePrice, setBasePrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [moq, setMoq] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadMedia = useCallback(async (id: string) => {
    try {
      setMedia(await listProductMedia(id));
    } catch (caught) {
      setError(caught);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setBusy(true);
      setError(null);
      try {
        const [cats] = await Promise.all([api.listAllCategories()]);
        if (!active) return;
        setCategories(cats);
        if (productId) {
          const detail = await api.getProduct(productId);
          if (!active) return;
          setProduct(detail);
          setForm({
            nameEn: detail.name.en,
            nameTa: detail.name.ta ?? "",
            slug: detail.slug,
            sku: detail.sku,
            categoryId: detail.categoryId,
            shortDesc: detail.shortDesc ?? "",
            description: detail.description ?? "",
            materialEn: detail.materialText?.en ?? "",
            materialTa: detail.materialText?.ta ?? "",
            weightKg: detail.weightKg,
            length: detail.dimensions?.length,
            width: detail.dimensions?.width,
            height: detail.dimensions?.height,
            unit: detail.dimensions?.unit ?? "cm",
            tags: (detail.tags ?? []).join(", "),
            status: detail.status ?? "DRAFT",
            featured: detail.featured,
            customizable: detail.customizable,
            seoMode: Boolean(detail.seo),
          });
          setSeo(detail.seo ?? {});
          setBasePrice(String(detail.pricing.basePrice ?? ""));
          setMrp(detail.pricing.mrp !== undefined ? String(detail.pricing.mrp) : "");
          setMoq(String(detail.pricing.moq ?? ""));
          await loadMedia(productId);
        }
      } catch (caught) {
        if (active) setError(caught);
      } finally {
        if (active) setBusy(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [productId, loadMedia]);

  const dimensions = useMemo(() => {
    const next: { length?: number; width?: number; height?: number; unit?: string } = {};
    if (form.length !== undefined) next.length = Number(form.length);
    if (form.width !== undefined) next.width = Number(form.width);
    if (form.height !== undefined) next.height = Number(form.height);
    if (form.unit) next.unit = form.unit;
    return Object.keys(next).length > 0 ? next : undefined;
  }, [form.length, form.width, form.height, form.unit]);

  const save = async () => {
    const common = {
      name: { en: form.nameEn, ta: form.nameTa || undefined },
      slug: slugify(form.slug) || undefined,
      sku: form.sku.trim() || undefined,
      categoryId: form.categoryId || undefined,
      shortDesc: form.shortDesc || undefined,
      description: form.description || undefined,
      materialText:
        form.materialEn || form.materialTa
          ? { en: form.materialEn, ta: form.materialTa || undefined }
          : undefined,
      weightKg: form.weightKg,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      status: form.status,
      featured: form.featured,
      customizable: form.customizable,
    };

    const ok = await mutation.run(async () => {
      if (productId) {
        await api.updateProduct(productId, { ...common, dimensions });
        const prices: { basePrice?: number; mrp?: number; moq?: number } = {};
        if (basePrice !== "") prices.basePrice = Number(basePrice);
        if (mrp !== "") prices.mrp = Number(mrp);
        if (moq !== "") prices.moq = Number(moq);
        if (Object.keys(prices).length > 0) await updateProductPricing(productId, prices);
      } else {
        const created = await api.createProduct({
          ...common,
          sku: form.sku.trim(),
          dimensions,
          basePrice: Number(basePrice),
          mrp: mrp !== "" ? Number(mrp) : undefined,
          moq: moq !== "" ? Number(moq) : undefined,
          seo: form.seoMode && Object.keys(seo).length > 0 ? seo : undefined,
        });
        router.push(`/admin/products/${created.id}`);
        router.refresh();
      }
    }, t("saveSuccess"));

    if (ok) return true;
    return false;
  };

  const onUpload = async (event: FormEvent<HTMLInputElement>) => {
    if (!productId) return;
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadMedia({
        file,
        ownerType: "PRODUCT",
        ownerId: productId,
        bucket: "PUBLIC",
      });
      event.currentTarget.value = "";
      await loadMedia(productId);
    } catch (caught) {
      mutation.run(() => Promise.reject(caught));
    } finally {
      setUploading(false);
    }
  };

  const move = async (from: number, to: number) => {
    if (!productId) return;
    const next = [...media];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setMedia(next);
    await mutation.run(() => setProductMediaOrder(productId, next.map((m) => m.id)));
  };

  if (error) return <ErrorState error={error} onRetry={() => router.refresh()} />;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {product ? <StatusBadge status={product.status ?? "DRAFT"} /> : null}
        </div>
        <div className="flex gap-2">
          <LinkBack />
          <Button type="submit" loading={mutation.busy} disabled={busy || !form.nameEn.trim() || !form.sku.trim()}>
            {t("save")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <Field label={t("nameEn")} htmlFor="p-name-en" required>
          <Input id="p-name-en" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} required />
        </Field>
        <Field label={t("nameTa")} htmlFor="p-name-ta">
          <Input id="p-name-ta" value={form.nameTa} onChange={(e) => setForm({ ...form, nameTa: e.target.value })} />
        </Field>
        <Field label={t("slug")} htmlFor="p-slug" hint={t("slugHint")}>
          <Input id="p-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </Field>
        <Field label={t("productCode")} htmlFor="p-sku" required>
          <Input id="p-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
        </Field>
        <Field label={t("product")} htmlFor="p-category">
          <Select id="p-category" value={form.categoryId ?? ""} onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}>
            <option value="">{t("none")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {localize(c.name)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("productStatus")} htmlFor="p-status">
          <Select id="p-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("shortDescription")} htmlFor="p-short">
          <Input id="p-short" value={form.shortDesc} onChange={(e) => setForm({ ...form, shortDesc: e.target.value })} maxLength={200} />
        </Field>
        <Field label={t("tags")} htmlFor="p-tags">
          <Input id="p-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="handmade, wire" />
        </Field>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Field label={t("description")} htmlFor="p-desc">
            <Textarea id="p-desc" rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("basePrice")} htmlFor="p-base" required>
          <Input id="p-base" type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required={!productId} />
        </Field>
        <Field label={t("mrpField")} htmlFor="p-mrp">
          <Input id="p-mrp" type="number" min={0} value={mrp} onChange={(e) => setMrp(e.target.value)} />
        </Field>
        <Field label={t("moq") + " (MOQ)"} htmlFor="p-moq">
          <Input id="p-moq" type="number" min={1} value={moq} onChange={(e) => setMoq(e.target.value)} />
        </Field>
        <Field label={t("weight") + " (kg)"} htmlFor="p-weight">
          <Input id="p-weight" type="number" min={0} step="0.01" value={form.weightKg ?? ""} onChange={(e) => setForm({ ...form, weightKg: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </Field>
        <Field label={t("dimensions") + " (L)"} htmlFor="p-len">
          <Input id="p-len" type="number" min={0} step="0.1" value={form.length ?? ""} onChange={(e) => setForm({ ...form, length: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </Field>
        <Field label={t("dimensions") + " (W)"} htmlFor="p-wid">
          <Input id="p-wid" type="number" min={0} step="0.1" value={form.width ?? ""} onChange={(e) => setForm({ ...form, width: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </Field>
        <Field label={t("dimensions") + " (H)"} htmlFor="p-hgt">
          <Input id="p-hgt" type="number" min={0} step="0.1" value={form.height ?? ""} onChange={(e) => setForm({ ...form, height: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </Field>
        <Field label="Unit" htmlFor="p-unit">
          <Input id="p-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="cm" />
        </Field>
        <Field label={t("material") + " (en)"} htmlFor="p-mat-en">
          <Input id="p-mat-en" value={form.materialEn} onChange={(e) => setForm({ ...form, materialEn: e.target.value })} />
        </Field>
        <Field label={t("material") + " (ta)"} htmlFor="p-mat-ta">
          <Input id="p-mat-ta" value={form.materialTa} onChange={(e) => setForm({ ...form, materialTa: e.target.value })} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-800">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600" />
          {t("featured")}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-800">
          <input type="checkbox" checked={form.customizable} onChange={(e) => setForm({ ...form, customizable: e.target.checked })} className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600" />
          {t("customizable")}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-800">
          <input type="checkbox" checked={form.seoMode} onChange={(e) => setForm({ ...form, seoMode: e.target.checked })} className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600" />
          {t("seoTitle")}
        </label>
      </div>

      {form.seoMode ? <SeoFields value={seo} onChange={setSeo} /> : null}

      {productId ? (
        <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-stone-700">{t("viewAttachment")}</h2>
          <div className="flex flex-wrap gap-3">
            {media.map((m, index) => (
              <div key={m.id} className="flex w-28 flex-col gap-1">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-stone-200">
                  {m.url ? <Image src={resolveMediaUrl(m.url)} alt={m.alt?.en ?? ""} fill sizes="112px" className="object-cover" /> : null}
                </div>
                {m.isPrimary ? <span className="text-center text-xs text-amber-700">{t("primaryImage")}</span> : null}
                <div className="flex justify-center gap-1 text-xs">
                  <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => void move(index, index - 1)}>
                    {t("moveUp")}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={index === media.length - 1} onClick={() => void move(index, index + 1)}>
                    {t("moveDown")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void mutation.run(async () => {
                        await detachProductMedia(productId, m.id);
                        await loadMedia(productId);
                      })
                    }
                  >
                    {t("delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-100">
            {uploading ? t("uploadSpinner") : t("uploadNew")}
            <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => void onUpload(e)} disabled={uploading} />
          </label>
        </section>
      ) : null}

      <FormFeedback kind="error">{mutation.error}</FormFeedback>
      <FormFeedback kind="success">{mutation.success}</FormFeedback>
    </form>
  );
}

function LinkBack() {
  const { t } = useI18n();
  return (
    <Link
      href="/admin/products"
      className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100"
    >
      {t("back")}
    </Link>
  );
}