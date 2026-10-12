"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import type { CmsPageView } from "@/lib/types/api";

export function CmsPageBody({ page }: { page: CmsPageView }) {
  const { t, localize } = useI18n();
  const paragraphs = localize(page.content)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-2xl font-semibold text-stone-900">{localize(page.title)}</h1>
      {paragraphs.length > 0 ? (
        <div className="flex flex-col gap-3 text-stone-700">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
      <Link href="/" className="text-sm font-medium text-amber-700 hover:underline">
        ← {t("backToHome")}
      </Link>
    </article>
  );
}