/**
 * Guest cart session.
 *
 * Guests have no bearer token, so the storefront mints a UUID v4 on first use,
 * stores it locally and sends it as `x-cart-session` on every cart request. The
 * backend validates it against the same UUID v4 pattern; a signed-in caller is
 * keyed by their user id and the header is ignored.
 */
export const CART_SESSION_STORAGE_KEY = "deepa.cart.session";
export const CART_SESSION_HEADER = "x-cart-session";

/** Mirrors the API `SESSION_ID_PATTERN` (UUID v4). */
export const CART_SESSION_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function randomUuid(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The stored guest session id, or null when none exists / storage is unavailable. */
export function getCartSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CART_SESSION_STORAGE_KEY);
    return value && CART_SESSION_PATTERN.test(value) ? value : null;
  } catch {
    return null;
  }
}

/** The stored guest session id, creating and persisting one when missing. */
export function ensureCartSession(): string {
  const existing = getCartSession();
  if (existing) return existing;
  const created = randomUuid();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CART_SESSION_STORAGE_KEY, created);
    } catch {
      // storage unavailable (private mode) — session stays in-memory only
    }
  }
  return created;
}

export function clearCartSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CART_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
