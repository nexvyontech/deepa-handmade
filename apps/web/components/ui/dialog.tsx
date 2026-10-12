"use client";

import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Minimal accessible modal. Renders nothing until open; unmounts children on
 * close. Backend-driven confirmations use this for deletes/destructive actions.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="mb-5 text-sm text-stone-600">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
          onClick={onClose}
          disabled={busy}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel ?? t("delete")}
        </button>
      </div>
    </Dialog>
  );
}