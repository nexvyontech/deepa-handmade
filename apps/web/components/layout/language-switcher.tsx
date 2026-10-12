"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, labels } = useI18n();
  const options: Locale[] = ["en", "ta"];

  return (
    <div className="flex items-center gap-1 text-sm" role="group" aria-label="Language">
      {options.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={active}
            className={`rounded-md px-2 py-1 font-medium transition-colors ${
              active
                ? "bg-amber-700 text-white"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {compact ? (option === "en" ? "EN" : "த") : labels[option]}
          </button>
        );
      })}
    </div>
  );
}