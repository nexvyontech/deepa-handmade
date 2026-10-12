import { beforeEach, describe, expect, it } from "vitest";
import {
  CART_SESSION_HEADER,
  CART_SESSION_PATTERN,
  CART_SESSION_STORAGE_KEY,
  clearCartSession,
  ensureCartSession,
  getCartSession,
} from "@/lib/cart/session";

describe("cart session", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("mints and persists a UUID v4 session on first use", () => {
    expect(getCartSession()).toBeNull();
    const session = ensureCartSession();
    expect(session).toMatch(CART_SESSION_PATTERN);
    expect(getCartSession()).toBe(session);
    expect(window.localStorage.getItem(CART_SESSION_STORAGE_KEY)).toBe(session);
  });

  it("returns the same session on subsequent calls", () => {
    const first = ensureCartSession();
    const second = ensureCartSession();
    expect(second).toBe(first);
  });

  it("ignores a malformed stored session", () => {
    window.localStorage.setItem(CART_SESSION_STORAGE_KEY, "not-a-uuid");
    expect(getCartSession()).toBeNull();
    expect(ensureCartSession()).toMatch(CART_SESSION_PATTERN);
  });

  it("clears the stored session", () => {
    ensureCartSession();
    clearCartSession();
    expect(getCartSession()).toBeNull();
  });

  it("exposes the header name shared with the API", () => {
    expect(CART_SESSION_HEADER).toBe("x-cart-session");
  });
});
