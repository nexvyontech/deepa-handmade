"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/context";
import { useI18n } from "@/lib/i18n/provider";
import { messageForError } from "@/lib/api/errors";
import { Button, buttonClassNames } from "@/components/ui/button";
import { EmptyState, ErrorState, FormFeedback } from "@/components/ui/feedback";
import { FullScreenLoader } from "@/components/ui/spinner";
import { formatINR } from "@/lib/utils/format";
import type { CartItemView } from "@/lib/types/api";

function CartLineRow({ item }: { item: CartItemView }) {
  const { t, localize } = useI18n();
  const { updateItem, removeItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minQty = item.moq > 0 ? item.moq : 1;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(messageForError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 border-b border-stone-200 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          {item.productSlug ? (
            <Link href={`/product/${encodeURIComponent(item.productSlug)}`} className="font-medium text-stone-900 hover:underline">
              {localize(item.productName)}
            </Link>
          ) : (
            <span className="font-medium text-stone-900">{localize(item.productName)}</span>
          )}
          {item.options.length > 0 ? (
            <span className="text-sm text-stone-500">
              {item.options.map((option) => localize(option.value)).join(" · ")}
            </span>
          ) : null}
          {item.variantSku ? (
            <span className="text-xs text-stone-400">
              {t("sku")}: {item.variantSku}
            </span>
          ) : null}
        </div>
        <span className="font-medium text-stone-900">{formatINR(item.lineTotal)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center rounded-lg border border-stone-300 bg-white">
          <button
            type="button"
            onClick={() => void run(() => updateItem(item.id, Math.max(minQty, item.qty - 1)))}
            disabled={busy || item.qty <= minQty}
            aria-label={t("decreaseQty")}
            className="px-3 py-1.5 text-lg leading-none text-stone-700 disabled:opacity-40"
          >
            −
          </button>
          <span aria-label={t("quantity")} className="w-10 text-center text-sm">
            {item.qty}
          </span>
          <button
            type="button"
            onClick={() => void run(() => updateItem(item.id, item.qty + 1))}
            disabled={busy}
            aria-label={t("increaseQty")}
            className="px-3 py-1.5 text-lg leading-none text-stone-700"
          >
            +
          </button>
        </div>

        <span className="text-sm text-stone-500">
          {formatINR(item.unitPrice)} × {item.qty}
        </span>

        <button
          type="button"
          onClick={() => void run(() => removeItem(item.id))}
          disabled={busy}
          className="text-sm font-medium text-red-700 hover:underline disabled:opacity-40"
        >
          {t("remove")}
        </button>

        <span className="text-xs text-stone-400">
          {t("moq")}: {minQty}
        </span>
      </div>

      <FormFeedback kind="error">{error}</FormFeedback>
    </li>
  );
}

export function CartPage() {
  const { t } = useI18n();
  const { cart, loading, error, issues, refresh, validate, clear } = useCart();
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    void validate();
  }, [validate]);

  if (loading && !cart) return <FullScreenLoader label={t("loading")} />;
  if (error && !cart) return <ErrorState error={error} onRetry={() => void refresh()} />;

  const items = cart?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        title={t("cartEmptyTitle")}
        message={t("cartEmptyMessage")}
        action={
          <Link href="/products" className={buttonClassNames("primary")}>
            {t("browseProducts")}
          </Link>
        }
      />
    );
  }

  const totals = cart!.totals;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">{t("cartTitle")}</h1>
        <Button
          variant="secondary"
          size="sm"
          loading={clearing}
          onClick={() => {
            setClearing(true);
            void clear().finally(() => setClearing(false));
          }}
        >
          {t("clearCart")}
        </Button>
      </div>

      {issues.length > 0 ? (
        <FormFeedback kind="error">
          <ul className="flex flex-col gap-1">
            {issues.map((issue, index) => (
              <li key={`${issue.code}-${issue.itemId ?? index}`}>{issue.message}</li>
            ))}
          </ul>
        </FormFeedback>
      ) : null}

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <ul className="rounded-xl border border-stone-200 bg-white px-4">
          {items.map((item) => (
            <CartLineRow key={item.id} item={item} />
          ))}
        </ul>

        <aside className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-stone-50 p-5">
          <h2 className="text-lg font-semibold text-stone-900">{t("orderSummary")}</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-600">{t("subtotal")}</dt>
              <dd className="text-stone-900">{formatINR(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-stone-600">{t("discount")}</dt>
                <dd className="text-emerald-700">−{formatINR(totals.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-stone-600">{t("shipping")}</dt>
              <dd className="text-stone-900">
                {totals.shippingStatus === "CONFIGURED" ? formatINR(totals.shipping) : t("shippingAtCheckout")}
              </dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
              <dt>{t("grandTotal")}</dt>
              <dd>{formatINR(totals.grandTotal)}</dd>
            </div>
          </dl>

          <Link href="/checkout" className={buttonClassNames("primary", "lg")}>
            {t("proceedToCheckout")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
