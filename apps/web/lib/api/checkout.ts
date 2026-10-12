import { apiRequest } from "./request";
import { CART_SESSION_HEADER, ensureCartSession } from "@/lib/cart/session";
import type { CheckoutPreparation, CheckoutPrepareInput } from "@/lib/types/api";

/**
 * Checkout preparation API (Phase 7).
 *
 * `prepare` validates the active cart and delivery address and returns a
 * server-authoritative order summary. It does not create an order or choose a
 * payment method — those arrive with the next phase.
 */
export function prepareCheckout(input: CheckoutPrepareInput): Promise<CheckoutPreparation> {
  return apiRequest<CheckoutPreparation>({
    method: "POST",
    path: "/checkout/prepare",
    body: input,
    headers: { [CART_SESSION_HEADER]: ensureCartSession() },
  });
}
