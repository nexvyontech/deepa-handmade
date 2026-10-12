"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductGrid } from "./product-grid";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/feedback";
import { useI18n } from "@/lib/i18n/provider";
import { toQueryString } from "@/lib/utils/format";
import type { ProductSort } from "@/lib/constants";
import type { CategoryView, Paginated, ProductListItem } from "@/lib/types/api";

export interface ListingQuery {
  q?: string;
  category?: string;
  sort?: ProductSort;
  page?: number;
  priceMin?: number;
  priceMax?: number;
  featured?: boolean;
  color?: string;
  size?: string;
  handle?: string;
}

export function ProductListing({
  query,
  result,
  categories,
  searchMode = false,
}: {
  query: ListingQuery;
  result: Paginated<ProductListItem>;
  categories: CategoryView[];
  searchMode?: boolean;
}) {
  const { t, localize } = useI18n();
  const router = useRouter();
  const [draftMin, setDraftMin] = useState(query.priceMin ? String(query.priceMin) : "");
  const [draftMax, setDraftMax] = useState(query.priceMax ? String(query.priceMax) : "");

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === query.category),
    [categories, query.category],
  );

  const update = (patch: Partial<ListingQuery>) => {
    const next: ListingQuery = { ...query, ...patch, page: patch.page ?? 1 };
    const clean: Record<string, string | number | boolean | undefined> = {
      q: next.q || undefined,
      category: next.category || undefined,
      sort: next.sort === "newest" ? undefined : next.sort,
      page: next.page && next.page > 1 ? next.page : undefined,
      priceMin: next.priceMin,
      priceMax: next.priceMax,
      featured: next.featured || undefined,
      color: next.color || undefined,
      size: next.size || undefined,
      handle: next.handle || undefined,
    };
    router.push(`/products${toQueryString(clean)}`);
  };

  const applyPrice = () => {
    const priceMin = draftMin === "" ? undefined : Number(draftMin);
    const priceMax = draftMax === "" ? undefined : Number(draftMax);
    update({ priceMin: Number.isFinite(priceMin) ? priceMin : undefined, priceMax: Number.isFinite(priceMax) ? priceMax : undefined, page: 1 });
  };

  const clearFilters = () => {
    setDraftMin("");
    setDraftMax("");
    router.push("/products");
  };

  const hasFilters = Boolean(
    query.category || query.priceMin || query.priceMax || query.featured || query.q,
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-stone-900">
          {searchMode && query.q ? `${t("searchingFor")} “${query.q}”` : selectedCategory ? localize(selectedCategory.name) : t("allProducts")}
        </h1>
        <p className="text-sm text-stone-500">
          {result.total} {t("resultsCount")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-stone-200 bg-white p-4">
        <Field label={t("sort")} htmlFor="sort">
          <Select
            id="sort"
            value={query.sort ?? "newest"}
            onChange={(event) => update({ sort: event.target.value as ProductSort })}
          >
            <option value="newest">{t("sortNewest")}</option>
            <option value="price_asc">{t("sortPriceAsc")}</option>
            <option value="price_desc">{t("sortPriceDesc")}</option>
            <option value="name_asc">{t("sortNameAsc")}</option>
            <option value="name_desc">{t("sortNameDesc")}</option>
            <option value="featured">{t("sortFeatured")}</option>
          </Select>
        </Field>

        {categories.length > 0 ? (
          <Field label={t("categories")} htmlFor="category">
            <Select
              id="category"
              value={query.category ?? ""}
              onChange={(event) => update({ category: event.target.value || undefined, page: 1 })}
            >
              <option value="">{t("allCategories")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {localize(category.name)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label={t("priceMin")} htmlFor="price-min">
          <Input
            id="price-min"
            type="number"
            min={0}
            inputMode="numeric"
            value={draftMin}
            onChange={(event) => setDraftMin(event.target.value)}
            placeholder="0"
            className="w-28"
          />
        </Field>
        <Field label={t("priceMax")} htmlFor="price-max">
          <Input
            id="price-max"
            type="number"
            min={0}
            inputMode="numeric"
            value={draftMax}
            onChange={(event) => setDraftMax(event.target.value)}
            placeholder="∞"
            className="w-28"
          />
        </Field>

        <Button variant="secondary" onClick={applyPrice}>
          {t("submit")}
        </Button>

        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={Boolean(query.featured)}
            onChange={(event) => update({ featured: event.target.checked || undefined, page: 1 })}
            className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600"
          />
          {t("onlyFeatured")}
        </label>

        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="pb-2">
            {t("clearFilters")}
          </Button>
        ) : null}
      </div>

      {result.items.length === 0 ? (
        <EmptyState title={t("noProductsTitle")} message={t("noProductsMessage")} />
      ) : (
        <ProductGrid products={result.items} />
      )}

      <Pagination page={result.page} totalPages={result.totalPages} onChange={(page) => update({ page })} />
    </section>
  );
}