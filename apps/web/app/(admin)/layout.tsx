import type { ReactNode } from "react";
import Link from "next/link";

const adminSections = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/production", label: "Production & QC" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-stone-200 bg-stone-900 text-stone-100">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="text-sm font-semibold uppercase tracking-widest">
            Deepa Handmade · Admin
          </Link>
          <Link
            href="/"
            className="text-sm text-stone-300 transition-colors hover:text-stone-100"
          >
            Back to storefront
          </Link>
        </nav>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-start gap-10 px-6 py-10">
        <aside className="sticky top-6 flex w-56 shrink-0 flex-col gap-1 text-sm">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-md px-3 py-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              {section.label}
            </Link>
          ))}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}