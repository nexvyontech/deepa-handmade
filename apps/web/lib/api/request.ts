import { ApiError } from "./errors";
import { getApiBaseUrl } from "@/lib/env";
import { notifyUnauthorized, readTokenPair, refreshTokenPair } from "./tokens";

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: QueryParams;
  /** JSON body (serialised automatically). Do not combine with formData. */
  body?: unknown;
  /** Multipart body — the browser sets the Content-Type boundary. */
  formData?: FormData;
  /**
   * Authorization mode.
   * - "auto" (default): attach the stored bearer token when present, and retry
   *   once after a single-flight refresh when the API answers 401.
   * - "none": never attach a token (public catalogue/CMS endpoints).
   */
  auth?: "auto" | "none";
  /** Extra request headers (e.g. the guest cart session). Never overrides auth. */
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface RawResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

const DEFAULT_TIMEOUT_MS = 20_000;

interface FetchResult {
  status: number;
  headers: Headers;
  json: unknown;
}

function buildUrl(path: string, query?: QueryParams): string {
  const base = getApiBaseUrl();
  const pathname = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${pathname}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) params.append(key, String(item));
      }
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException ? error.name === "AbortError"
    : error instanceof Error ? error.name === "AbortError"
    : false;
}

async function performFetch(opts: RequestOptions): Promise<FetchResult> {
  const { method = "GET", path, query, body, formData, auth = "auto", headers: extraHeaders, timeoutMs } = opts;
  const token = auth === "auto" ? (readTokenPair()?.accessToken ?? null) : null;

  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined && formData === undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value);
    }
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const init: RequestInit = {
    method,
    headers,
    signal: controller.signal,
    cache: "no-store",
  };
  if (formData !== undefined) {
    init.body = formData;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(buildUrl(path, query), init);
    clearTimeout(timer);
    const text = await res.text();
    return { status: res.status, headers: res.headers, json: parseJson(text) };
  } catch (error) {
    clearTimeout(timer);
    if (isAbort(error)) throw ApiError.timeout();
    throw ApiError.network();
  }
}

function toRaw<T>(res: FetchResult): RawResponse<T> {
  return { data: res.json as T, status: res.status, headers: res.headers };
}

async function raw<T>(opts: RequestOptions): Promise<RawResponse<T>> {
  const { auth = "auto" } = opts;
  const first = await performFetch(opts);

  const shouldRefresh = auth === "auto" && first.status === 401;
  if (!shouldRefresh) {
    if (first.status >= 400) throw ApiError.fromStatus(first.status, first.json);
    return toRaw<T>(first);
  }

  try {
    await refreshTokenPair();
  } catch (error) {
    notifyUnauthorized();
    throw error;
  }

  const second = await performFetch(opts);
  if (second.status >= 400) {
    if (second.status === 401) notifyUnauthorized();
    throw ApiError.fromStatus(second.status, second.json);
  }
  return toRaw<T>(second);
}

export async function apiRequest<T>(opts: RequestOptions): Promise<T> {
  const res = await raw<T>(opts);
  return res.data;
}

export async function apiRaw<T>(opts: RequestOptions): Promise<RawResponse<T>> {
  return raw<T>(opts);
}