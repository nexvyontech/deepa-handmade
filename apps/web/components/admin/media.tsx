"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { ScreenHeader } from "./screen-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, FormFeedback } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAsyncMutation } from "./use-async-mutation";
import { useI18n } from "@/lib/i18n/provider";
import * as api from "@/lib/api/media";
import { OWNER_TYPES, MEDIA_BUCKETS, MEDIA_STATUSES, type MediaBucket, type MediaStatus, type OwnerType } from "@/lib/constants";
import { resolveMediaUrl } from "@/lib/env";
import { formatBytes, formatDate } from "@/lib/utils/format";
import type { MediaView } from "@/lib/types/api";

const PAGE_LIMIT = 24;

export function AdminMedia() {
  const { t } = useI18n();
  const mutation = useAsyncMutation();

  const [items, setItems] = useState<MediaView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<MediaStatus | "">("");
  const [error, setError] = useState<unknown>(null);

  const [file, setFile] = useState<File | null>(null);
  const [ownerType, setOwnerType] = useState<OwnerType>("PRODUCT");
  const [ownerId, setOwnerId] = useState("");
  const [bucket, setBucket] = useState<MediaBucket>("PUBLIC");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<MediaView | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.listMedia({
        status: statusFilter || undefined,
        page,
        limit: PAGE_LIMIT,
      });
      setItems(result.items);
      setTotal(result.total);
      setError(null);
    } catch (caught) {
      setError(caught);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadMedia({
        file,
        ownerType,
        ownerId,
        bucket,
      });
      setFile(null);
      await load();
    } catch (caught) {
      mutation.run(() => Promise.reject(caught));
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const ok = await mutation.run(async () => {
      await api.deleteMedia(deleting.id);
    }, t("saveSuccess"));
    if (ok) {
      setDeleting(null);
      await load();
    }
  };

  const setStatus = async (media: MediaView, status: MediaStatus) => {
    const ok = await mutation.run(() => api.updateMedia(media.id, { status }), t("saveSuccess"));
    if (ok) await load();
  };

  const setPrimary = async (media: MediaView) => {
    const ok = await mutation.run(() => api.updateMedia(media.id, { isPrimary: true }), t("saveSuccess"));
    if (ok) await load();
  };

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title={t("media")} />

      <form
        className="flex flex-wrap items-end gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
        onSubmit={onUpload}
      >
        <label className="flex flex-col gap-1 text-sm text-stone-700">
          {t("chooseFile")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            className="block text-sm text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <span className="text-xs text-stone-400">{t("supportedImageTypes")}</span>
        </label>

        <Field label={t("ownerType")} htmlFor="media-owner-type">
          <Select id="media-owner-type" value={ownerType} onChange={(e) => setOwnerType(e.target.value as OwnerType)}>
            {OWNER_TYPES.map((ot) => (
              <option key={ot} value={ot}>
                {ot}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Owner ID" htmlFor="media-owner-id" required>
          <Input id="media-owner-id" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required placeholder="24-char id" />
        </Field>

        <Field label={t("mediaBucket")} htmlFor="media-bucket">
          <Select id="media-bucket" value={bucket} onChange={(e) => setBucket(e.target.value as MediaBucket)}>
            {MEDIA_BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </Field>

        <Button type="submit" loading={uploading} disabled={!file || !ownerId.trim()}>
          {t("uploadNew")}
        </Button>
      </form>

      <div className="w-full max-w-xs">
        <Select value={statusFilter} onChange={(e) => setStatusFilter((e.target.value || "") as MediaStatus | "")}>
          <option value="">{t("mediaStatus")}: {t("all")}</option>
          {MEDIA_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {error ? <ErrorState error={error} onRetry={() => void load()} /> : null}

      {!error && items.length === 0 ? (
        <EmptyState title={t("noMedia")} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((media) => (
            <div key={media.id} className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-stone-100 bg-stone-50">
                {media.url ? (
                  <Image src={resolveMediaUrl(media.url)} alt={media.alt?.en ?? media.id} fill sizes="(min-width: 1152px) 240px, 50vw" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-center text-xs text-stone-400">
                    Video / unavailable
                  </div>
                )}
                {media.isPrimary ? (
                  <span className="absolute left-1 top-1 rounded-full bg-amber-700 px-2 py-0.5 text-xs font-medium text-white">
                    {t("primaryImage")}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-1 text-xs text-stone-600">
                <span className="truncate font-mono" title={media.id}>
                  {media.id}
                </span>
                <span>
                  {media.kind} · {formatBytes(media.sizeBytes)} · {media.bucket}
                </span>
                <span>{formatDate(media.createdAt)}</span>
                <StatusBadge status={media.status} />
              </div>
              <div className="flex flex-wrap gap-1">
                <Select
                  className="!w-auto !py-1 text-xs"
                  value={media.status}
                  onChange={(e) => void setStatus(media, e.target.value as MediaStatus)}
                >
                  {MEDIA_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                {!media.isPrimary ? (
                  <Button variant="ghost" size="sm" onClick={() => void setPrimary(media)}>
                    {t("makePrimary")}
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => setDeleting(media)}>
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > PAGE_LIMIT ? (
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ‹
          </Button>
          <span className="text-sm text-stone-500">
            Page {page}/{Math.max(1, Math.ceil(total / PAGE_LIMIT))} · {total} {t("resultsCount")}
          </span>
          <Button variant="secondary" size="sm" disabled={page * PAGE_LIMIT >= total} onClick={() => setPage(page + 1)}>
            ›
          </Button>
        </div>
      ) : null}

      <FormFeedback kind="error">{mutation.error}</FormFeedback>
      <FormFeedback kind="success">{mutation.success}</FormFeedback>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("deleteMediaConfirm")}
        message={deleting?.id ?? ""}
        busy={mutation.busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}