"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ScreenHeader, AdminTable } from "./screen-header";
import { SeoFields } from "./seo-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, FormFeedback } from "@/components/ui/feedback";
import { useAsyncMutation } from "./use-async-mutation";
import { useI18n } from "@/lib/i18n/provider";
import * as api from "@/lib/api/cms";
import type { SeoInput } from "@/lib/api/admin";
import { CMS_PAGE_TYPES, CMS_PAGE_STATUSES, type CmsPageStatus, type CmsPageType } from "@/lib/constants";
import { slugify, formatDate } from "@/lib/utils/format";
import type { CmsPageView } from "@/lib/types/api";

const TYPE_LABEL_KEY: Record<CmsPageType, "pageTypePage" | "pageTypePolicy" | "pageTypeContact" | "pageTypeFaq"> = {
  PAGE: "pageTypePage",
  POLICY: "pageTypePolicy",
  CONTACT: "pageTypeContact",
  FAQ: "pageTypeFaq",
};

interface FormState {
  slug: string;
  type: CmsPageType;
  titleEn: string;
  titleTa: string;
  contentEn: string;
  contentTa: string;
  sortOrder: number;
  seoMode: boolean;
}

const EMPTY: FormState = { slug: "", type: "PAGE", titleEn: "", titleTa: "", contentEn: "", contentTa: "", sortOrder: 0, seoMode: false };

export function AdminCmsPages() {
  const { t, localize } = useI18n();
  const mutation = useAsyncMutation();

  const [filter, setFilter] = useState<CmsPageStatus | "">("");
  const [pages, setPages] = useState<CmsPageView[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CmsPageView | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [seo, setSeo] = useState<SeoInput>({});

  const load = useCallback(async () => {
    try {
      setPages(await api.listAdminPages(filter || undefined));
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }, [filter]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setSeo({});
    setShowForm(true);
  };

  const startEdit = (page: CmsPageView) => {
    setEditing(page);
    setForm({
      slug: page.slug,
      type: page.type,
      titleEn: page.title.en,
      titleTa: page.title.ta ?? "",
      contentEn: page.content?.en ?? "",
      contentTa: page.content?.ta ?? "",
      sortOrder: page.sortOrder,
      seoMode: Boolean(page.seo),
    });
    setSeo(page.seo ?? {});
    setShowForm(true);
  };

  const save = async () => {
    const ok = await mutation.run(async () => {
      if (editing) {
        await api.updatePage(editing.id, {
          slug: slugify(form.slug) || undefined,
          type: form.type,
          title: { en: form.titleEn, ta: form.titleTa || undefined },
          content: form.contentEn || form.contentTa ? { en: form.contentEn, ta: form.contentTa || undefined } : undefined,
          sortOrder: form.sortOrder,
          seo: form.seoMode && Object.keys(seo).length > 0 ? seo : undefined,
        });
      } else {
        await api.createPage({
          slug: slugify(form.slug),
          type: form.type,
          title: { en: form.titleEn, ta: form.titleTa || undefined },
          content: form.contentEn || form.contentTa ? { en: form.contentEn, ta: form.contentTa || undefined } : undefined,
          sortOrder: form.sortOrder,
          seo: form.seoMode && Object.keys(seo).length > 0 ? seo : undefined,
        });
      }
    }, t("saveSuccess"));
    if (ok) {
      setShowForm(false);
      await load();
    }
  };

  const changeStatus = async (page: CmsPageView, action: "publish" | "unpublish" | "archive") => {
    if (action === "archive") {
      const ok = await mutation.run(() => api.deletePage(page.id), t("saveSuccess"));
      if (ok) await load();
      return;
    }
    const ok = await mutation.run(() => api.setPageStatus(page.id, action), t("saveSuccess"));
    if (ok) await load();
  };

  const statusLabel = (value: string) => {
    if (value === "DRAFT") return t("drafts");
    if (value === "PUBLISHED") return t("published");
    if (value === "ARCHIVED") return t("archived");
    return value;
  };

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title={t("cmsPages")}
        action={
          <Button onClick={startCreate} disabled={busy}>
            {t("newPage")}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1">
        {["", ...CMS_PAGE_STATUSES].map((value) => (
          <button
            key={value || "ALL"}
            type="button"
            onClick={() => setFilter(value as CmsPageStatus | "")}
            aria-pressed={filter === value}
            className={`rounded-md px-3 py-1.5 text-sm ${
              filter === value ? "bg-amber-700 font-medium text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {value === "" ? t("all") : statusLabel(value)}
          </button>
        ))}
      </div>

      {showForm ? (
        <form
          className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("pageTitle") + " (en)"} htmlFor="pg-title-en" required>
              <Input id="pg-title-en" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} required />
            </Field>
            <Field label={t("pageTitle") + " (ta)"} htmlFor="pg-title-ta">
              <Input id="pg-title-ta" value={form.titleTa} onChange={(e) => setForm({ ...form, titleTa: e.target.value })} />
            </Field>
            <Field label={t("slug")} htmlFor="pg-slug" hint={t("slugHint")}>
              <Input id="pg-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </Field>
            <Field label={t("pageType")} htmlFor="pg-type">
              <Select id="pg-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CmsPageType })}>
                {CMS_PAGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(TYPE_LABEL_KEY[type])}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("sortOrder")} htmlFor="pg-order">
              <Input id="pg-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label={t("contentEn")} htmlFor="pg-content-en">
            <Textarea id="pg-content-en" rows={8} value={form.contentEn} onChange={(e) => setForm({ ...form, contentEn: e.target.value })} />
          </Field>
          <Field label={t("contentTa")} htmlFor="pg-content-ta">
            <Textarea id="pg-content-ta" rows={8} value={form.contentTa} onChange={(e) => setForm({ ...form, contentTa: e.target.value })} />
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={form.seoMode} onChange={(e) => setForm({ ...form, seoMode: e.target.checked })} className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600" />
            {t("seoTitle")}
          </label>
          {form.seoMode ? <SeoFields value={seo} onChange={setSeo} /> : null}

          <FormFeedback kind="error">{mutation.error}</FormFeedback>
          <FormFeedback kind="success">{mutation.success}</FormFeedback>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={mutation.busy} disabled={!form.titleEn.trim() || !form.slug.trim()}>
              {t("save")}
            </Button>
          </div>
        </form>
      ) : null}

      {error ? <ErrorState error={error} onRetry={() => void load()} /> : null}

      {!error && pages.length === 0 ? (
        <EmptyState title={t("noPages")} />
      ) : (
        <AdminTable head={[t("pageTitle"), t("slug"), t("pageType"), t("status"), t("sortOrder"), t("updatedAt"), t("actions")]}>
          {pages.map((page) => (
            <tr key={page.id}>
              <td className="px-4 py-3 font-medium text-stone-900">{localize(page.title)}</td>
              <td className="px-4 py-3 font-mono text-xs text-stone-600">{page.slug}</td>
              <td className="px-4 py-3 text-stone-600">{page.type}</td>
              <td className="px-4 py-3">
                <StatusBadge status={page.status} />
              </td>
              <td className="px-4 py-3 text-stone-600">{page.sortOrder}</td>
              <td className="px-4 py-3 text-stone-600">{formatDate(page.updatedAt ?? page.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(page)}>
                    {t("edit")}
                  </Button>
                  {page.status === "DRAFT" ? (
                    <Button size="sm" onClick={() => void changeStatus(page, "publish")}>
                      {t("publish")}
                    </Button>
                  ) : null}
                  {page.status === "PUBLISHED" ? (
                    <Button variant="secondary" size="sm" onClick={() => void changeStatus(page, "unpublish")}>
                      {t("unpublish")}
                    </Button>
                  ) : null}
                  {page.status !== "ARCHIVED" ? (
                    <Button variant="ghost" size="sm" onClick={() => void changeStatus(page, "archive")}>
                      {t("archive")}
                    </Button>
                  ) : null}
                  {page.status === "PUBLISHED" ? (
                    <Link href={`/${page.slug}`} className="text-amber-700 hover:underline">
                      {t("browseProducts")}
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}