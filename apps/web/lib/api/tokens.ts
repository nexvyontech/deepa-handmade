import { ApiError } from "./errors";
import { getApiBaseUrl } from "@/lib/env";

/**
 * Client-side bearer token storage (localStorage).
 *
 * The Phase 4 backend is stateless bearer-auth only — no cookies — so tokens
 * live in localStorage. Server components must never import this module
 * (`window` is guarded everywhere).
 *
 * SECURITY: tokens are only ever read for the Authorization header and are
 * never logged or leaked into UI state.
 */
const ACCESS_TOKEN_KEY = "deepa.accessToken";
const REFRESH_TOKEN_KEY = "deepa.refreshToken";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function readTokenPair(): TokenPair | null {
  if (typeof window === "undefined") return null;
  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function writeTokenPair(pair: TokenPair): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, pair.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, pair.refreshToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasTokens(): boolean {
  return readTokenPair() !== null;
}

/** Global listener notified when a session becomes invalid (e.g. refresh failed). */
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(): void {
  clearTokens();
  unauthorizedHandler?.();
}

let refreshInFlight: Promise<TokenPair> | null = null;

/** Exchange the stored refresh token for a fresh pair (single-flight). */
export async function refreshTokenPair(): Promise<TokenPair> {
  const current = readTokenPair();
  if (!current) {
    throw ApiError.fromStatus(401, {
      statusCode: 401,
      code: "UNAUTHORIZED",
      message: "You are not signed in.",
      path: "/auth/refresh",
      timestamp: new Date().toISOString(),
    });
  }
  if (!refreshInFlight) {
    refreshInFlight = doRefresh(current.refreshToken)
      .then((pair) => {
        writeTokenPair(pair);
        refreshInFlight = null;
        return pair;
      })
      .catch((error) => {
        refreshInFlight = null;
        throw error;
      });
  }
  return refreshInFlight;
}

/** Refresh must bypass the request layer to avoid a self-referencing 401 loop. */
async function doRefresh(refreshToken: string): Promise<TokenPair> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    clearTimeout(timer);
    throw ApiError.network();
  }
  clearTimeout(timer);

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      notifyUnauthorized();
    }
    throw ApiError.fromStatus(res.status, body);
  }

  const data = body as { accessToken?: string; refreshToken?: string };
  if (!data.accessToken || !data.refreshToken) {
    throw ApiError.fromStatus(500, {
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: "The refresh endpoint returned an invalid response.",
      path: "/auth/refresh",
      timestamp: new Date().toISOString(),
    });
  }
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}