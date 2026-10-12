import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { formatINR, formatDate, formatBytes, toQueryString, slugify } from "@/lib/utils/format";
import { translate, localizeText, localizeTextOrText, toInput, getDictionary, type MessageKey } from "@/lib/i18n";
import { metadataFromSeo } from "@/lib/utils/seo";
import type { SeoBlock } from "@/lib/types/api";

describe("format utilities", () => {
  it("formatINR groups digits with Indian notation", () => {
    expect(formatINR(123456)).toContain("1,23,456");
    expect(formatINR(0)).toContain("0");
    expect(formatINR(undefined)).toBe("—");
    expect(formatINR(null)).toBe("—");
    expect(formatINR(Number.NaN)).toBe("—");
  });

  it("formatDate renders a readable date or an em dash", () => {
    expect(formatDate("2026-10-01T00:00:00Z")).not.toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("formatBytes scales units", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
    expect(formatBytes(null)).toBe("—");
  });

  it("toQueryString skips empty values", () => {
    expect(toQueryString({ a: 1, b: "x y", c: undefined, d: null, e: "" })).toBe("?a=1&b=x+y");
    expect(toQueryString({})).toBe("");
  });

  it("slugify lowercases, hyphenates and trims", () => {
    expect(slugify("  Wire Kudai  Large ")).toBe("wire-kudai-large");
    expect(slugify("A la carte!")).toBe("a-la-carte");
    expect(slugify("")).toBe("");
  });
});

describe("i18n helpers", () => {
  it("translate returns the right locale string and falls back to the key", () => {
    expect(getDictionary("en").products).toBe("Products");
    expect(translate("products", "ta")).toBe("பொருட்கள்");
    expect(translate("__no_such_key__" as MessageKey, "en")).toBe("__no_such_key__");
  });

  it("localizeText prefers Tamil when available", () => {
    expect(localizeText({ en: "Size", ta: "அளவு" }, "ta")).toBe("அளவு");
    expect(localizeText({ en: "Size", ta: "அளவு" }, "en")).toBe("Size");
    expect(localizeText({ en: "Size" }, "ta")).toBe("Size");
    expect(localizeText(undefined, "ta")).toBe("");
  });

  it("localizeTextOrText passes plain strings through", () => {
    expect(localizeTextOrText("hello", "ta")).toBe("hello");
    expect(localizeTextOrText({ en: "Size", ta: "அளவு" }, "ta")).toBe("அளவு");
  });

  it("toInput flattens missing halves to empty strings", () => {
    expect(toInput(undefined)).toEqual({ en: "", ta: "" });
    expect(toInput({ en: "X" })).toEqual({ en: "X", ta: "" });
  });
});

describe("metadataFromSeo", () => {
  const previous = process.env.NEXT_PUBLIC_API_URL;
  beforeAll(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previous;
  });

  it("returns fallback metadata when no SEO block exists", () => {
    const meta = metadataFromSeo(null, { title: "Fallback" });
    expect(meta.title).toBe("Fallback");
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it("maps the backend SEO block to Next metadata", () => {
    const seo: SeoBlock = {
      title: "Wire kudai",
      metaDescription: "Hand-woven",
      ogTitle: "Deepa kudai",
      ogDescription: "OG desc",
      ogImageMediaId: "media-id-1",
      canonicalUrl: "https://example.com/kudai",
      noindex: true,
    };
    const meta = metadataFromSeo(seo, { title: "Fallback" });
    expect(meta.title).toBe("Wire kudai");
    expect(meta.description).toBe("Hand-woven");
    expect(meta.openGraph?.title).toBe("Deepa kudai");
    expect(meta.openGraph?.images).toEqual(["http://localhost:3001/api/v1/media/media-id-1/content"]);
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe("https://example.com/kudai");
  });
});