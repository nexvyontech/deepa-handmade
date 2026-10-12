"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/context";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/provider";
import { listAddresses } from "@/lib/api/addresses";
import { prepareCheckout } from "@/lib/api/checkout";
import { messageForError } from "@/lib/api/errors";
import { CheckoutForm } from "./checkout-form";
import { Button, buttonClassNames } from "@/components/ui/button";
import { EmptyState, FormFeedback } from "@/components/ui/feedback";
import { Spinner, FullScreenLoader } from "@/components/ui/spinner";
import { formatINR } from "@/lib/utils/format";
import type { AddressView, CheckoutPreparation, CheckoutPrepareInput } from "@/lib/types/api";

export function CheckoutPage() {
  const { t } = useI18n();
  const { cart, loading } = useCart();
  const { status } = useAuth();
  const [addresses, setAddresses] = useState<AddressView[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparation, setPreparation] = useState<CheckoutPreparation | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    listAddresses()
      .then((list) => {
        if (!cancelled) setAddresses(list);
      })
      .catch(() => {
        // A failed address fetch must not block inline checkout.
        if (!cancelled) setAddresses([]);
      })
      .finally(() => {
        if (!cancelled) setAddressesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Anonymous shoppers always use the inline form.
  const savedAddresses = status === "authenticated" ? addresses : [];

  const submit = async (input: CheckoutPrepareInput) => {
    setSubmitting(true);
    setError(null);
    try {
      setPreparation(await prepareCheckout(input));
    } catch (caught) {
      setError(messageForError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !cart) return <FullScreenLoader label={t("loading")} />;
  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title={t("cartEmptyTitle")}
        message={t("cartEmptyCheckout")}
        action={
          <Link href="/products" className={buttonClassNames("primary")}>
            {t("browseProducts")}
          </Link>
        }
      />
    );
  }

  const grandTotal = preparation ? preparation.summary.grandTotal : cart.totals.grandTotal;
  const shippingValue = preparation
    ? formatINR(preparation.summary.shipping)
    : cart.totals.shippingStatus === "CONFIGURED"
      ? formatINR(cart.totals.shipping)
      : t("shippingAtCheckout");
  const discount = preparation ? preparation.summary.discount : cart.totals.discount;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-stone-900">{t("checkoutTitle")}</h1>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          {preparation ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-stone-900">{t("deliveryAddress")}</h2>
              <dl className="flex flex-col gap-1 text-sm text-stone-700">
                <dt className="sr-only">{t("deliveryAddress")}</dt>
                <dd className="font-medium text-stone-900">{preparation.address.recipient}</dd>
                <dd>
                  {[
                    preparation.address.line1,
                    preparation.address.line2,
                    preparation.address.villageTown,
                    preparation.address.district,
                    preparation.address.state,
                    preparation.address.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
                <dd>{preparation.address.mobile}</dd>
              </dl>

              <FormFeedback kind="error">
                <ul className="flex flex-col gap-1">
                  {preparation.issues.map((issue, index) => (
                    <li key={`${issue.code}-${issue.itemId ?? index}`}>{issue.message}</li>
                  ))}
                </ul>
              </FormFeedback>

              <FormFeedback kind="success">{t("checkoutStagingNotice")}</FormFeedback>

              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setPreparation(null)}>
                  {t("changeAddress")}
                </Button>
                <Link href="/cart" className={buttonClassNames("ghost")}>
                  {t("backToCart")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-stone-900">{t("deliveryAddress")}</h2>
              {status === "authenticated" && addressesLoading ? (
                <p className="flex items-center gap-2 text-sm text-stone-500">
                  <Spinner size="sm" /> {t("loadingAddresses")}
                </p>
              ) : null}
              <CheckoutForm savedAddresses={savedAddresses} submitting={submitting} error={error} onSubmit={(input) => void submit(input)} />
            </div>
          )}
        </section>

        <aside className="flex h-fit flex-col gap-4 rounded-xl border border-stone-200 bg-stone-50 p-5">
          <h2 className="text-lg font-semibold text-stone-900">{t("orderSummary")}</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-600">{t("subtotal")}</dt>
              <dd className="text-stone-900">{formatINR(cart.totals.subtotal)}</dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-stone-600">{t("discount")}</dt>
                <dd className="text-emerald-700">−{formatINR(discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-stone-600">{t("shipping")}</dt>
              <dd className="text-stone-900">{shippingValue}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
              <dt>{t("grandTotal")}</dt>
              <dd>{formatINR(grandTotal)}</dd>
            </div>
          </dl>
          <Link href="/cart" className="text-sm font-medium text-amber-700 hover:underline">
            {t("backToCart")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
