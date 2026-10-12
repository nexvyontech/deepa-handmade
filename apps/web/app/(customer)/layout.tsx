import type { ReactNode } from "react";
import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <StoreHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
      <StoreFooter />
    </div>
  );
}