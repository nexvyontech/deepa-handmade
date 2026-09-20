import Link from "next/link";

export default function CustomerHomePage() {
  return (
    <section className="flex flex-col items-start gap-6">
      <h1 className="text-4xl font-semibold leading-tight tracking-tight">
        Authentic wire kudai, woven by hand.
      </h1>
      <p className="max-w-xl text-lg leading-8 text-stone-600">
        Deepa Handmade brings traditional Tamil Nadu basket making to your door.
        Browse the collection, choose payment on delivery or UPI, and let us
        craft your order from scratch.
      </p>
      <div className="flex gap-4">
        <Link
          href="/products"
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Browse products
        </Link>
        <Link
          href="/about"
          className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-stone-100"
        >
          Our story
        </Link>
      </div>
    </section>
  );
}