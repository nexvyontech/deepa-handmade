import { en, type Messages } from "./dictionaries/en";
import { ta } from "./dictionaries/ta";
import type { LocalizedText } from "@/lib/types/api";

export type Locale = "en" | "ta";
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALES: readonly Locale[] = ["en", "ta"];

export const LOCALE_STORAGE_KEY = "deepa.locale";
export const LOCALE_COOKIE = "lang";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ta";
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ta: "தமிழ்",
};

const dictionaries: Record<Locale, Messages> = { en, ta };

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale] ?? en;
}

export type MessageKey = keyof Messages;

export function translate(key: MessageKey, locale: Locale): string {
  return dictionaries[locale][key] ?? en[key] ?? key;
}

/** Backend content ships as `{ en, ta? }` — pick by locale, fall back to English. */
export function localizeText(text: LocalizedText | undefined | null, locale: Locale): string {
  if (!text) return "";
  if (locale === "ta" && text.ta) return text.ta;
  return text.en ?? "";
}

export function localizeTextOrText(
  text: LocalizedText | string | undefined | null,
  locale: Locale,
): string {
  if (typeof text === "string") return text;
  return localizeText(text, locale);
}

export function toInput(text: LocalizedText | undefined | null): { en: string; ta: string } {
  return { en: text?.en ?? "", ta: text?.ta ?? "" };
}