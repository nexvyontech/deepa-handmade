import { apiRequest } from "./request";
import type { AdminPricing } from "@/lib/types/api";

export interface PricingInput {
  basePrice?: number;
  mrp?: number;
  moq?: number;
}

/**
 * PATCH /admin/pricing/products/:productId — the ONLY write path for prices.
 * Requires `price.update`; generic product endpoints reject price fields.
 */
export function updateProductPricing(productId: string, input: PricingInput): Promise<AdminPricing> {
  const body: Record<string, number> = {};
  if (input.basePrice !== undefined) body.basePrice = input.basePrice;
  if (input.mrp !== undefined) body.mrp = input.mrp;
  if (input.moq !== undefined) body.moq = input.moq;
  return apiRequest<AdminPricing>({
    method: "PATCH",
    path: `/admin/pricing/products/${productId}`,
    body,
  });
}