"use client";

import { useI18n } from "@/lib/i18n/provider";
import { Button } from "./button";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Pagination">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        ‹
      </Button>
      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? "primary" : "secondary"}
          size="sm"
          onClick={() => onChange(p)}
          className={p === page ? "" : "text-stone-600"}
        >
          {p}
        </Button>
      ))}
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        ›
      </Button>
    </nav>
  );
}

export function ResultsInfo({ page, totalPages, total }: { page: number; totalPages: number; total: number }) {
  const { t } = useI18n();
  if (total === 0) return null;
  return (
    <p className="text-sm text-stone-500">
      {total} {t("resultsCount")} · {t("sort")}‑page {page}/{totalPages}
    </p>
  );
}