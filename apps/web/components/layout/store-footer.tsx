import Link from "next/link";

export function StoreFooter() {
  return (
    <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
      <p>Deepa Handmade · Handcrafted in Tamil Nadu</p>
      <nav className="mt-2 flex items-center justify-center gap-4 text-stone-400">
        <Link href="/about" className="hover:underline">
          About
        </Link>
        <Link href="/products" className="hover:underline">
          Products
        </Link>
      </nav>
    </footer>
  );
}