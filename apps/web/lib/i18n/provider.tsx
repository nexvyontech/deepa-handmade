"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  localizeText,
  type Locale,
  type MessageKey,
} from "./index";
import { getDictionary } from "./index";
import type { LocalizedText } from "@/lib/types/api";

interface I18nValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** Translate a UI string from the dictionaries (en/ta). */
  t: (key: MessageKey) => string;
  /** Pick the current-locale string from backend `{ en, ta? }` content. */
  localize: (text: LocalizedText | undefined | null) => string;
  labels: typeof LOCALE_LABELS;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored)) queueMicrotask(() => setLocaleState(stored));
    } catch {
      // ignore storage failures
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // storage unavailable (private mode) — keep session-only
    }
    try {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // ignore
    }
  };

  const value = useMemo<I18nValue>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      setLocale,
      t: (key: MessageKey) => dict[key] ?? getDictionary(DEFAULT_LOCALE)[key] ?? key,
      localize: (text) => localizeText(text, locale),
      labels: LOCALE_LABELS,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Hydrate the stored locale after mount (avoids SSR mismatch; page chrome uses
// the cookie anyway). Exporting for the provider is intentional.
export { isLocale };

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}