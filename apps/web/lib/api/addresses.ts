import { apiRequest } from "./request";
import type { AddressView, CheckoutInlineAddress } from "@/lib/types/api";

/**
 * Customer address book API (Phase 7). Strictly authenticated — a signed-in
 * customer can only ever see and edit their own addresses.
 */
export type AddressInput = CheckoutInlineAddress & { isDefault?: boolean };
export type AddressUpdateInput = Partial<AddressInput>;

/** GET /addresses */
export function listAddresses(): Promise<AddressView[]> {
  return apiRequest<AddressView[]>({ path: "/addresses" });
}

/** POST /addresses */
export function createAddress(input: AddressInput): Promise<AddressView> {
  return apiRequest<AddressView>({ method: "POST", path: "/addresses", body: input });
}

/** PATCH /addresses/:addressId */
export function updateAddress(addressId: string, input: AddressUpdateInput): Promise<AddressView> {
  return apiRequest<AddressView>({
    method: "PATCH",
    path: `/addresses/${encodeURIComponent(addressId)}`,
    body: input,
  });
}

/** DELETE /addresses/:addressId */
export function removeAddress(addressId: string): Promise<AddressView> {
  return apiRequest<AddressView>({ method: "DELETE", path: `/addresses/${encodeURIComponent(addressId)}` });
}

/** POST /addresses/:addressId/default */
export function setDefaultAddress(addressId: string): Promise<AddressView> {
  return apiRequest<AddressView>({
    method: "POST",
    path: `/addresses/${encodeURIComponent(addressId)}/default`,
  });
}
