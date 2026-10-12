import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
      <p className="text-6xl font-semibold text-stone-300">404</p>
      <h1 className="text-xl font-semibold text-stone-900">Page not found</h1>
      <p className="text-sm text-stone-500">
        The page you&apos;re looking for doesn&apos;t exist or isn&apos;t published yet.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
      >
        Back to home
      </Link>
    </div>
  );
}