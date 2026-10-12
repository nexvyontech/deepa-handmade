"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { useI18n } from "@/lib/i18n/provider";
import { useCart } from "@/lib/cart/context";

export function StoreHeader() {
  const { t } = useI18n();
  const { itemCount } = useCart();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setQuery("");
    router.push(`/products?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="border-b border-stone-200 bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          Deepa Handmade
        </Link>

        <nav className="order-3 flex w-full items-center justify-between gap-4 text-sm font-medium md:order-none md:w-auto">
          <div className="flex items-center gap-5">
            <Link href="/products" className="hover:underline">
              {t("products")}
            </Link>
            <Link href="/categories" className="hover:underline">
              {t("categories")}
            </Link>
            <Link href="/about" className="hover:underline">
              {t("about")}
            </Link>
          </div>

          <form onSubmit={onSearch} role="search">
            <label htmlFor="store-search" className="sr-only">
              {t("searchPlaceholder")}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 focus-within:border-amber-600 focus-within:ring-1 focus-within:ring-amber-600">
              <svg
                className="h-4 w-4 text-stone-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                id="store-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-40 bg-transparent text-sm outline-none placeholder:text-stone-400 md:w-52"
              />
            </div>
          </form>
        </nav>

        <div className="flex items-center gap-4">
          <LanguageSwitcher compact />
          <Link
            href="/cart"
            className="relative text-sm font-medium text-foreground hover:underline"
            aria-label={itemCount > 0 ? `${t("cart")} (${itemCount})` : t("cart")}
          >
            {t("cart")}
            {itemCount > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-700 px-1 text-xs font-semibold text-white">
                {itemCount}
              </span>
            ) : null}
          </Link>
          <Link href="/login" className="text-sm font-medium text-foreground hover:underline">
            {t("signIn")}
          </Link>
        </div>
      </div>
    </header>
  );
}