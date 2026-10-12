import { apiRequest } from "./request";
import type { LocalizedTextInput } from "./admin";
import type { VariantOptionView, VariantView } from "@/lib/types/api";
import type { OptionType, StockMode } from "@/lib/constants";

// --------------------------------------------------------------------- variants

export interface VariantCreateInput {
  productId: string;
  optionValueIds?: string[];
  variantSku?: string;
  priceDelta?: number;
  stockMode?: StockMode;
  active?: boolean;
  imageMediaIds?: string[];
  isCustomColor?: boolean;
  isCustomSize?: boolean;
}

export interface VariantUpdateInput {
  optionValueIds?: string[];
  variantSku?: string;
  priceDelta?: number;
  stockMode?: StockMode;
  active?: boolean;
  imageMediaIds?: string[];
  isCustomColor?: boolean;
  isCustomSize?: boolean;
}

export function listVariants(query?: { productId?: string; active?: boolean }): Promise<VariantView[]> {
  return apiRequest<VariantView[]>({
    path: "/admin/variants",
    query: query
      ? { productId: query.productId, active: query.active === undefined ? undefined : query.active }
      : undefined,
  });
}

export function getVariant(id: string): Promise<VariantView> {
  return apiRequest<VariantView>({ path: `/admin/variants/${id}` });
}

export function createVariant(input: VariantCreateInput): Promise<VariantView> {
  return apiRequest<VariantView>({ method: "POST", path: "/admin/variants", body: input });
}

export function updateVariant(id: string, input: VariantUpdateInput): Promise<VariantView> {
  return apiRequest<VariantView>({ method: "PATCH", path: `/admin/variants/${id}`, body: input });
}

export function deleteVariant(id: string): Promise<VariantView> {
  return apiRequest<VariantView>({ method: "DELETE", path: `/admin/variants/${id}` });
}

// ---------------------------------------------------------------------- options

export interface OptionCreateInput {
  optionType: OptionType;
  value: LocalizedTextInput;
  hex?: string;
  displayOrder?: number;
  active?: boolean;
}

export interface OptionUpdateInput {
  value?: LocalizedTextInput;
  hex?: string;
  displayOrder?: number;
  active?: boolean;
}

export function listOptions(query?: { optionType?: OptionType; active?: boolean }): Promise<VariantOptionView[]> {
  return apiRequest<VariantOptionView[]>({
    path: "/admin/options",
    query: query
      ? { optionType: query.optionType, active: query.active === undefined ? undefined : query.active }
      : undefined,
  });
}

export function createOption(input: OptionCreateInput): Promise<VariantOptionView> {
  return apiRequest<VariantOptionView>({ method: "POST", path: "/admin/options", body: input });
}

export function updateOption(id: string, input: OptionUpdateInput): Promise<VariantOptionView> {
  return apiRequest<VariantOptionView>({ method: "PATCH", path: `/admin/options/${id}`, body: input });
}

export function deleteOption(id: string): Promise<VariantOptionView> {
  return apiRequest<VariantOptionView>({ method: "DELETE", path: `/admin/options/${id}` });
}