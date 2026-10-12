"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context";
import { useI18n } from "@/lib/i18n/provider";
import { FullScreenLoader } from "@/components/ui/spinner";

/**
 * Client-side route protection for the admin area (UX only — the backend is
 * authoritative and rejects every unauthorised call). Redirects to /login.
 */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { status, isStaff } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous" || (status === "authenticated" && !isStaff)) {
      router.replace("/login");
    }
  }, [status, isStaff, router]);

  if (status === "loading") {
    return <FullScreenLoader label={t("loading")} />;
  }

  if (status !== "authenticated" || !isStaff) {
    return <FullScreenLoader label={t("loading")} />;
  }

  return <>{children}</>;
}