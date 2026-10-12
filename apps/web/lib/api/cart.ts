import { apiRequest } from "./request";
import { CART_SESSION_HEADER, ensureCartSession } from "@/lib/cart/session";
import type { CartValidationResult, CartView } from "@/lib/types/api";

/**
 * Customer cart API (Phase 7).
 *
 * Every call carries the guest cart session header; for a signed-in customer
 * the bearer token takes precedence on the server and the header is ignored.
 * All prices, MOQs and totals are computed by the backend — never trust the
 * values held in the browser.
 */
function cartHeaders(): Record<string, string> {
  return { [CART_SESSION_HEADER]: ensureCartSession() };
}

export interface AddCartItemInput {
  productId: string;
  variantId?: string;
  qty: number;
}

/** GET /cart — server-revalidated cart (creates an empty one on first visit). */
export function getCart(): Promise<CartView> {
  return apiRequest<CartView>({ path: "/cart", headers: cartHeaders() });
}

/** POST /cart/items — add a product/variant line (folds into a matching line). */
export function addCartItem(input: AddCartItemInput): Promise<CartView> {
  return apiRequest<CartView>({ method: "POST", path: "/cart/items", body: input, headers: cartHeaders() });
}

/** PATCH /cart/items/:itemId — set the quantity of a line (MOQ enforced). */
export function updateCartItem(itemId: string, qty: number): Promise<CartView> {
  return apiRequest<CartView>({
    method: "PATCH",
    path: `/cart/items/${encodeURIComponent(itemId)}`,
    body: { qty },
    headers: cartHeaders(),
  });
}

/** DELETE /cart/items/:itemId — remove one line. */
export function removeCartItem(itemId: string): Promise<CartView> {
  return apiRequest<CartView>({
    method: "DELETE",
    path: `/cart/items/${encodeURIComponent(itemId)}`,
    headers: cartHeaders(),
  });
}

/** DELETE /cart — remove every line. */
export function clearCart(): Promise<CartView> {
  return apiRequest<CartView>({ method: "DELETE", path: "/cart", headers: cartHeaders() });
}

/** POST /cart/validate — revalidate and persist corrections (drops stale lines). */
export function validateCart(): Promise<CartValidationResult> {
  return apiRequest<CartValidationResult>({ method: "POST", path: "/cart/validate", headers: cartHeaders() });
}

/** POST /cart/merge — fold a guest-session cart into the signed-in customer cart. */
export function mergeCart(sessionId: string): Promise<CartView> {
  return apiRequest<CartView>({ method: "POST", path: "/cart/merge", body: { sessionId } });
}
