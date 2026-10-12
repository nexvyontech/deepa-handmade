import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteLogin } from "@/components/auth/site-login";

export const metadata: Metadata = {
  title: "Staff sign in | Deepa Handmade",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-16">
      <div className="flex flex-col items-center gap-8">
        <p className="text-lg font-semibold tracking-tight text-stone-900">Deepa Handmade</p>
        <Suspense>
          <SiteLogin />
        </Suspense>
      </div>
    </div>
  );
}