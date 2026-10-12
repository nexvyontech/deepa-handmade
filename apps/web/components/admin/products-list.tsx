"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ScreenHeader, AdminTable } from "./screen-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n";
import * as api from "@/lib/api/admin";
import { formatINR } from "@/lib/utils/format";
import { PRODUCT_STATUSES, type ProductStatus } from "@/lib/constants";
import type { ProductListItem } from "@/lib/types/api";

type Tab = "ALL" | (typeof PRODUCT_STATUSES)[number];

const TABS: Array<{ value: Tab; labelKey: MessageKey }> = [
  { value: "ALL", labelKey: "all" },
  { value: "ACTIVE", labelKey: "statusActive" },
  { value: "DRAFT", labelKey: "draft" },
  { value: "INACTIVE", labelKey: "inactive" },
  { value: "ARCHIVED", labelKey: "archived" },
];

const PAGE_LIMIT = 25;

export function AdminProductsList() {
  const { t, localize } = useI18n();

  const [items, setItems] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<Tab>("ACTIVE");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const result = await api.listProductsAdmin({
        q: query || undefined,
        status: tab === "ALL" ? undefined : tab,
        page,
        limit: PAGE_LIMIT,
      });
      setItems(result.items);
      setTotal(result.total);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }, [tab, query, page]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(draft.trim());
    setPage(1);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  const statusLabel = (status: ProductStatus | undefined) => {
    if (!status) return t("draft");
    switch (status) {
      case "ACTIVE":
        return t("statusActive");
      case "DRAFT":
        return t("draft");
      case "INACTIVE":
        return t("inactive");
      case "ARCHIVED":
        return t("archived");
      default:
        return status;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title={t("productAdmin")}
        action={
          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            {t("newProduct")}
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1">
          {TABS.map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => switchTab(value)}
              aria-pressed={tab === value}
              className={`rounded-md px-3 py-1.5 text-sm ${
                tab === value ? "bg-amber-700 font-medium text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        <form onSubmit={onSearch} role="search" className="flex items-end gap-2">
          <Field label={t("searchPlaceholder")} htmlFor="product-admin-search">
            <Input
              id="product-admin-search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </Field>
          <Button type="submit" variant="secondary" disabled={busy}>
            {t("submit")}
          </Button>
        </form>

        <span className="text-sm text-stone-500">
          {total} {t("resultsCount")}
        </span>
      </div>

      {error ? <ErrorState error={error} onRetry={() => void load()} /> : null}

      {!error && items.length === 0 && !busy ? (
        <EmptyState title={t("noProducts")} />
      ) : !error && items.length > 0 ? (
        <AdminTable head={[t("name"), t("productCode"), t("productPricing"), t("featured"), t("status"), t("actions")]}>
          {items.map((product) => (
            <tr key={product.id}>
              <td className="px-4 py-3 font-medium text-stone-900">
                <Link href={`/admin/products/${product.id}`} className="hover:underline">
                  {localize(product.name)}
                </Link>
              </td>
              <td className="px-4 py-3 text-stone-600">{product.sku}</td>
              <td className="px-4 py-3 text-stone-600">
                {formatINR(product.pricing.effectivePrice)}
                {product.pricing.mrp ? (
                  <span className="ml-2 text-stone-400 line-through">{formatINR(product.pricing.mrp)}</span>
                ) : null}
                <span className="ml-2 text-xs text-stone-400">MOQ {product.pricing.moq}</span>
              </td>
              <td className="px-4 py-3">{product.featured ? "★" : ""}</td>
              <td className="px-4 py-3">
                <StatusBadge status={product.status ?? "DRAFT"} />
                <span className="sr-only">{statusLabel(product.status)}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm">
                    <Link href={`/admin/products/${product.id}`}>{t("edit")}</Link>
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Link href={`/admin/variants?productId=${product.id}`}>{t("variantsOfProduct")}</Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : null}

      {total > PAGE_LIMIT ? (
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ‹
          </Button>
          <span className="text-sm text-stone-500">
            Page {page}/{Math.max(1, Math.ceil(total / PAGE_LIMIT))}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page * PAGE_LIMIT >= total}
            onClick={() => setPage(page + 1)}
          >
            ›
          </Button>
        </div>
      ) : null}
    </div>
  );
}