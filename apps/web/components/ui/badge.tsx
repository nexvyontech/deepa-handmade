import type { ReactNode } from "react";

type Tone = "stone" | "green" | "amber" | "red" | "blue";

const toneClasses: Record<Tone, string> = {
  stone: "bg-stone-100 text-stone-700",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-800",
};

export function Badge({ tone = "stone", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "green",
  PUBLISHED: "green",
  AVAILABLE: "green",
  INACTIVE: "amber",
  DRAFT: "stone",
  PENDING_MODERATION: "blue",
  REJECTED: "red",
  HIDDEN: "stone",
  ARCHIVED: "red",
  SUSPENDED: "red",
  DISABLED: "stone",
  PENDING_VERIFICATION: "blue",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "stone"}>{status}</Badge>;
}