import type { ReactNode } from "react";
import { Button } from "./button";
import { messageForError } from "@/lib/api/errors";
import { useI18n } from "@/lib/i18n/provider";

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-red-700" role="alert">
        {messageForError(error)}
      </p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-stone-700">{title}</p>
      {message ? <p className="text-sm text-stone-500">{message}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function FormFeedback({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  if (!children) return null;
  const cls =
    kind === "error"
      ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      : "rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700";
  return (
    <div className={cls} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}