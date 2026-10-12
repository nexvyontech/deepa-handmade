"use client";

import { Field, Input, Checkbox, Textarea } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/provider";
import type { SeoInput } from "@/lib/api/admin";

export function SeoFields({
  value,
  onChange,
}: {
  value: SeoInput;
  onChange: (next: SeoInput) => void;
}) {
  const { t } = useI18n();

  const set = <K extends keyof SeoInput>(key: K, next: SeoInput[K]) => onChange({ ...value, [key]: next });

  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <legend className="px-1 text-sm font-medium text-stone-700">{t("seoTitle")}</legend>

      <Field label={t("metaTitle")} htmlFor="seo-title">
        <Input id="seo-title" value={value.title ?? ""} onChange={(e) => set("title", e.target.value || undefined)} maxLength={200} />
      </Field>

      <Field label={t("metaDescription")} htmlFor="seo-meta-desc">
        <Textarea id="seo-meta-desc" value={value.metaDescription ?? ""} onChange={(e) => set("metaDescription", e.target.value || undefined)} maxLength={320} rows={3} />
      </Field>

      <Field label={t("ogTitle")} htmlFor="seo-og-title">
        <Input id="seo-og-title" value={value.ogTitle ?? ""} onChange={(e) => set("ogTitle", e.target.value || undefined)} maxLength={200} />
      </Field>

      <Field label={t("ogDescription")} htmlFor="seo-og-desc">
        <Textarea id="seo-og-desc" value={value.ogDescription ?? ""} onChange={(e) => set("ogDescription", e.target.value || undefined)} maxLength={320} rows={3} />
      </Field>

      <Field label={t("canonicalUrl")} htmlFor="seo-canonical">
        <Input id="seo-canonical" type="url" value={value.canonicalUrl ?? ""} onChange={(e) => set("canonicalUrl", e.target.value || undefined)} maxLength={500} placeholder="https://…" />
      </Field>

      <Field label={t("ogImageMediaId")} htmlFor="seo-og-image">
        <Input id="seo-og-image" value={value.ogImageMediaId ?? ""} onChange={(e) => set("ogImageMediaId", e.target.value || undefined)} placeholder="24-char media id" />
      </Field>

      <Checkbox checked={Boolean(value.noindex)} onChange={(e) => set("noindex", e.target.checked || undefined)} label={t("noindex")} />
    </fieldset>
  );
}