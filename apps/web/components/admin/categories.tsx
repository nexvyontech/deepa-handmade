"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ScreenHeader, AdminTable } from "./screen-header";
import { SeoFields } from "./seo-fields";
import { MediaIdPicker } from "./media-id-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, FormFeedback } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAsyncMutation } from "./use-async-mutation";
import { useI18n } from "@/lib/i18n/provider";
import * as api from "@/lib/api/admin";
import type { CategoryView } from "@/lib/types/api";
import { slugify } from "@/lib/utils/format";

const EMPTY_FORM = {
  nameEn: "",
  nameTa: "",
  slug: "",
  parentId: undefined as string | undefined,
  imageMediaId: undefined as string | undefined,
  bannerMediaId: undefined as string | undefined,
  sortOrder: 0,
  active: true,
  seoMode: false,
};

export function AdminCategories() {
  const { t, localize } = useI18n();
  const mutation = useAsyncMutation();

  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);

  const [editing, setEditing] = useState<CategoryView | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [seo, setSeo] = useState<api.SeoInput>({});
  const [deleting, setDeleting] = useState<CategoryView | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.listAllCategories();
      setCategories(list);
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

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSeo({});
    setShowForm(true);
  };

  const startEdit = (category: CategoryView) => {
    setEditing(category);
    setForm({
      nameEn: category.name.en,
      nameTa: category.name.ta ?? "",
      slug: category.slug,
      parentId: category.parentId,
      imageMediaId: category.imageMediaId,
      bannerMediaId: category.bannerMediaId,
      sortOrder: category.sortOrder,
      active: category.active,
      seoMode: Boolean(category.seo),
    });
    setSeo(category.seo ?? {});
    setShowForm(true);
  };

  const save = async () => {
    const input: api.CategoryCreateInput = {
      name: { en: form.nameEn, ta: form.nameTa || undefined },
      slug: slugify(form.slug) || undefined,
      parentId: form.parentId,
      imageMediaId: form.imageMediaId,
      bannerMediaId: form.bannerMediaId,
      sortOrder: form.sortOrder,
      seo: form.seoMode && Object.keys(seo).length > 0 ? seo : undefined,
    };
    const ok = await mutation.run(async () => {
      if (editing) {
        await api.updateCategory(editing.id, { ...input, active: form.active });
      } else {
        await api.createCategory(input);
      }
    }, t("saveSuccess"));
    if (ok) {
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    }
  };

  const toggleActive = async (category: CategoryView) => {
    const ok = await mutation.run(
      () => api.updateCategory(category.id, { active: !category.active }),
      t("saveSuccess"),
    );
    if (ok) await load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const ok = await mutation.run(() => api.deleteCategory(deleting.id), t("saveSuccess"));
    if (ok) {
      setDeleting(null);
      await load();
    }
  };

  if (error && categories.length === 0) {
    return <ErrorState error={error} onRetry={() => void load()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title={t("categoryAdmin")}
        action={
          <Button onClick={startCreate} disabled={busy}>
            {t("newCategory")}
          </Button>
        }
      />

      {showForm ? (
        <form
          className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("nameEn")} htmlFor="cat-name-en" required>
              <Input id="cat-name-en" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} required />
            </Field>
            <Field label={t("nameTa")} htmlFor="cat-name-ta">
              <Input id="cat-name-ta" value={form.nameTa} onChange={(e) => setForm({ ...form, nameTa: e.target.value })} />
            </Field>
            <Field label={t("slug")} htmlFor="cat-slug" hint={t("slugHint")}>
              <Input id="cat-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </Field>
            <Field label={t("parentCategory")} htmlFor="cat-parent">
              <Select id="cat-parent" value={form.parentId ?? ""} onChange={(e) => setForm({ ...form, parentId: e.target.value || undefined })}>
                <option value="">{t("none")}</option>
                {categories
                  .filter((c) => c.id !== editing?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {localize(c.name)}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={t("imageMediaId")} htmlFor="cat-image">
              <MediaIdPicker value={form.imageMediaId} onChange={(v) => setForm({ ...form, imageMediaId: v })} />
            </Field>
            <Field label={t("bannerMediaId")} htmlFor="cat-banner">
              <MediaIdPicker value={form.bannerMediaId} onChange={(v) => setForm({ ...form, bannerMediaId: v })} />
            </Field>
            <Field label={t("sortOrder")} htmlFor="cat-order">
              <Input id="cat-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </Field>
            <fieldset className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600"
                />
                {t("active")}
              </label>
            </fieldset>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.seoMode}
              onChange={(e) => setForm({ ...form, seoMode: e.target.checked })}
              className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600"
            />
            {t("seoTitle")}
          </label>
          {form.seoMode ? <SeoFields value={seo} onChange={setSeo} /> : null}

          <FormFeedback kind="error">{mutation.error}</FormFeedback>
          <FormFeedback kind="success">{mutation.success}</FormFeedback>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={mutation.busy} disabled={!form.nameEn.trim()}>
              {t("save")}
            </Button>
          </div>
        </form>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState title={t("noCategories")} />
      ) : (
        <AdminTable head={[t("name"), t("slug"), t("parentCategory"), t("sortOrder"), t("seoTitle"), t("status"), t("actions")]}>
          {categories.map((category) => (
            <tr key={category.id}>
              <td className="px-4 py-3 font-medium text-stone-900">{localize(category.name)}</td>
              <td className="px-4 py-3 text-stone-600">{category.slug}</td>
              <td className="px-4 py-3 text-stone-600">
                {categories.find((c) => c.id === category.parentId)
                  ? localize(categories.find((c) => c.id === category.parentId)!.name)
                  : "—"}
              </td>
              <td className="px-4 py-3 text-stone-600">{category.sortOrder}</td>
              <td className="px-4 py-3 text-stone-600">{category.seo ? "✓" : "—"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={category.active ? "ACTIVE" : "INACTIVE"} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(category)}>
                    {t("edit")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void toggleActive(category)}>
                    {category.active ? t("deactivate") : t("reactivate")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(category)}>
                    {t("delete")}
                  </Button>
                  <Link href={`/products?category=${category.slug}`} className="text-amber-700 hover:underline">
                    {t("browseProducts")}
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("confirmDeleteCategory")}
        message={deleting ? localize(deleting.name) : ""}
        busy={mutation.busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}