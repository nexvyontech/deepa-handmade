import type { ReactNode } from "react";
import { RequireStaff } from "@/lib/auth/require-staff";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireStaff>
      <AdminShell>{children}</AdminShell>
    </RequireStaff>
  );
}