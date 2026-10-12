"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n";

interface NavItem {
  href: string;
  label: MessageKey;
  perm?: "product.read" | "category.read" | "variant.read" | "price.update" | "media.read" | "cms.read" | "seo.read";
  exact?: boolean;
}

const LIVE_SECTIONS: NavItem[] = [
  { href: "/admin", label: "dashboard", exact: true },
  { href: "/admin/products", label: "productAdmin", perm: "product.read" },
  { href: "/admin/categories", label: "categoryAdmin", perm: "category.read" },
  { href: "/admin/variants", label: "variants", perm: "variant.read" },
  { href: "/admin/options", label: "variantOptions", perm: "variant.read" },
  { href: "/admin/pricing", label: "pricing", perm: "price.update" },
  { href: "/admin/media", label: "media", perm: "media.read" },
  { href: "/admin/cms/pages", label: "cmsPages", perm: "cms.read" },
  { href: "/admin/cms/banners", label: "banners", perm: "cms.read" },
  { href: "/admin/seo", label: "seo", perm: "seo.read" },
];

const FUTURE_SECTIONS: NavItem[] = [
  { href: "/admin/orders", label: "orders" },
  { href: "/admin/inventory", label: "inventory" },
  { href: "/admin/production", label: "production" },
  { href: "/admin/reports", label: "reports" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout, hasPermission } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();

  const visibleSections = LIVE_SECTIONS.filter((item) => !item.perm || hasPermission(item.perm));

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-stone-800 bg-stone-900 text-stone-100">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/admin" className="text-sm font-semibold uppercase tracking-widest">
            Deepa Handmade · Admin
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-stone-400 sm:inline">
              {t("signedInAs")} {user?.name ?? ""}
            </span>
            <Link href="/" className="text-stone-300 transition-colors hover:text-stone-100">
              {t("backToStore")}
            </Link>
            <Button variant="ghost" size="sm" onClick={() => void logout()} className="text-stone-300 hover:text-white">
              {t("signOut")}
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-start gap-8 px-6 py-8 md:flex-row">
        <nav className="flex w-full shrink-0 flex-row flex-wrap gap-1 text-sm md:w-52 md:flex-col" aria-label="Admin sections">
          {visibleSections.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 transition-colors ${
                  active
                    ? "bg-amber-700 font-medium text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                {t(item.label)}
              </Link>
            );
          })}

          {visibleSections.length > 0 ? (
            <div className="my-2 hidden h-px w-full bg-stone-200 md:block" />
          ) : null}

          {FUTURE_SECTIONS.map((item) => (
            <span
              key={item.href}
              title={t("comingInLaterPhases")}
              aria-disabled="true"
              className="cursor-not-allowed rounded-md px-3 py-2 text-stone-400 line-through"
            >
              {t(item.label)}
              <span className="ml-1 text-[10px] normal-case text-stone-400">({t("comingInLaterPhases")})</span>
            </span>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}