"use client";

import { useCallback, useEffect, useState } from "react";
import { ScreenHeader, AdminTable } from "./screen-header";
import { MediaIdPicker } from "./media-id-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, FormFeedback } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAsyncMutation } from "./use-async-mutation";
import { useI18n } from "@/lib/i18n/provider";
import * as api from "@/lib/api/cms";
import { BANNER_TARGETS, type BannerTarget } from "@/lib/constants";
import { formatDate } from "@/lib/utils/format";
import type { BannerView } from "@/lib/types/api";

interface FormState {
  titleEn: string;
  titleTa: string;
  imageMediaId: string;
  ctaUrl: string;
  ctaLabelEn: string;
  ctaLabelTa: string;
  target: BannerTarget;
  location: string;
  sortOrder: number;
  active: boolean;
  startAt: string;
  endAt: string;
}

const EMPTY: FormState = {
  titleEn: "",
  titleTa: "",
  imageMediaId: "",
  ctaUrl: "",
  ctaLabelEn: "",
  ctaLabelTa: "",
  target: "PRODUCT",
  location: "home",
  sortOrder: 0,
  active: true,
  startAt: "",
  endAt: "",
};

export function AdminBanners() {
  const { t, localize } = useI18n();
  const mutation = useAsyncMutation();

  const [banners, setBanners] = useState<BannerView[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BannerView | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleting, setDeleting] = useState<BannerView | null>(null);

  const load = useCallback(async () => {
    try {
      setBanners(await api.listAllBanners());
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

  const toIso = (value: string) => (value ? new Date(value).toISOString() : undefined);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const startEdit = (banner: BannerView) => {
    setEditing(banner);
    setForm({
      titleEn: banner.title?.en ?? "",
      titleTa: banner.title?.ta ?? "",
      imageMediaId: banner.image?.id ?? "",
      ctaUrl: banner.ctaUrl ?? "",
      ctaLabelEn: banner.ctaLabel?.en ?? "",
      ctaLabelTa: banner.ctaLabel?.ta ?? "",
      target: banner.target ?? "PRODUCT",
      location: banner.location ?? "home",
      sortOrder: banner.sortOrder,
      active: banner.active,
      startAt: banner.startAt ? new Date(banner.startAt).toISOString().slice(0, 16) : "",
      endAt: banner.endAt ? new Date(banner.endAt).toISOString().slice(0, 16) : "",
    });
    setShowForm(true);
  };

  const save = async () => {
    const ok = await mutation.run(async () => {
      const input = {
        title: form.titleEn || form.titleTa ? { en: form.titleEn, ta: form.titleTa || undefined } : undefined,
        imageMediaId: form.imageMediaId,
        ctaUrl: form.ctaUrl || undefined,
        ctaLabel:
          form.ctaLabelEn || form.ctaLabelTa
            ? { en: form.ctaLabelEn, ta: form.ctaLabelTa || undefined }
            : undefined,
        target: form.target,
        location: form.location || undefined,
        sortOrder: form.sortOrder,
        active: form.active,
        startAt: toIso(form.startAt),
        endAt: toIso(form.endAt),
      };
      if (editing) await api.updateBanner(editing.id, input);
      else await api.createBanner(input as api.BannerCreateInput);
    }, t("saveSuccess"));
    if (ok) {
      setShowForm(false);
      await load();
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const ok = await mutation.run(() => api.deleteBanner(deleting.id), t("saveSuccess"));
    if (ok) {
      setDeleting(null);
      await load();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title={t("banners")}
        action={
          <Button onClick={startCreate} disabled={busy}>
            {t("newBanner")}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={`${t("bannerTitle")} (en)`} htmlFor="b-title-en">
              <Input id="b-title-en" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} maxLength={200} />
            </Field>
            <Field label={`${t("bannerTitle")} (ta)`} htmlFor="b-title-ta">
              <Input id="b-title-ta" value={form.titleTa} onChange={(e) => setForm({ ...form, titleTa: e.target.value })} maxLength={200} />
            </Field>
            <Field label={t("bannerImage")} htmlFor="b-image" required>
              <MediaIdPicker value={form.imageMediaId} onChange={(v) => setForm({ ...form, imageMediaId: v ?? "" })} />
            </Field>
            <Field label={t("ctaUrl")} htmlFor="b-cta">
              <Input id="b-cta" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="/products?featured=true" />
            </Field>
            <Field label={`${t("ctaLabel")} (en)`} htmlFor="b-cta-en">
              <Input id="b-cta-en" value={form.ctaLabelEn} onChange={(e) => setForm({ ...form, ctaLabelEn: e.target.value })} />
            </Field>
            <Field label={`${t("ctaLabel")} (ta)`} htmlFor="b-cta-ta">
              <Input id="b-cta-ta" value={form.ctaLabelTa} onChange={(e) => setForm({ ...form, ctaLabelTa: e.target.value })} />
            </Field>
            <Field label={t("target")} htmlFor="b-target">
              <Select id="b-target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as BannerTarget })}>
                {BANNER_TARGETS.map((target) => (
                  <option key={target} value={target}>
                    {target}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Location" htmlFor="b-location">
              <Input id="b-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="home" />
            </Field>
            <Field label={t("sortOrder")} htmlFor="b-order">
              <Input id="b-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </Field>
            <Field label={t("startAt")} htmlFor="b-start">
              <Input id="b-start" type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
            </Field>
            <Field label={t("endAt")} htmlFor="b-end">
              <Input id="b-end" type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm text-stone-800">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600" />
              {t("active")}
            </label>
          </div>

          <FormFeedback kind="error">{mutation.error}</FormFeedback>
          <FormFeedback kind="success">{mutation.success}</FormFeedback>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={mutation.busy} disabled={!form.imageMediaId}>
              {t("save")}
            </Button>
          </div>
        </form>
      ) : null}

      {error ? <ErrorState error={error} onRetry={() => void load()} /> : null}

      {!error && banners.length === 0 ? (
        <EmptyState title={t("noBanners")} />
      ) : (
        <AdminTable head={[t("bannerTitle"), t("bannerImage"), t("target"), "Location", t("sortOrder"), t("status"), t("startAt"), t("endAt"), t("actions")]}>
          {banners.map((banner) => (
            <tr key={banner.id}>
              <td className="px-4 py-3 font-medium text-stone-900">{localize(banner.title) || "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-stone-600">{banner.image?.id ?? "—"}</td>
              <td className="px-4 py-3 text-stone-600">{banner.target ?? "—"}</td>
              <td className="px-4 py-3 text-stone-600">{banner.location ?? "—"}</td>
              <td className="px-4 py-3 text-stone-600">{banner.sortOrder}</td>
              <td className="px-4 py-3">
                <StatusBadge status={banner.active ? "ACTIVE" : "INACTIVE"} />
              </td>
              <td className="px-4 py-3 text-stone-600">{formatDate(banner.startAt)}</td>
              <td className="px-4 py-3 text-stone-600">{formatDate(banner.endAt)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(banner)}>
                    {t("edit")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(banner)}>
                    {t("delete")}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("deleteBannerConfirm")}
        message={deleting ? localize(deleting.title) || deleting.id : ""}
        busy={mutation.busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}