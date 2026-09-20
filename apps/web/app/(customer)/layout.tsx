import type { ReactNode } from "react";
import Link from "next/link";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-stone-200 bg-background">
        <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Deepa Handmade
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/products" className="hover:underline">
              Products
            </Link>
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">{children}</main>
      <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
        Deepa Handmade · Handcrafted in Tamil Nadu
      </footer>
    </div>
  );
}