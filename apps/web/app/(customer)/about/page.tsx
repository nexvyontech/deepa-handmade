import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">About</h1>
      <p className="max-w-xl text-stone-600">
        A small family workshop in Tamil Nadu keeping the craft of wire basket
        making alive — one order at a time.
      </p>
    </section>
  );
}