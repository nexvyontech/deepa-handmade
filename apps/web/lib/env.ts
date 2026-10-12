/**
 * API base URL resolution.
 *
 * The backend publishes every route under `/api/v1`. Code must never hard-code
 * a hostname — the host comes from `NEXT_PUBLIC_API_URL` (see `.env.example`).
 */
const API_PREFIX = "/api/v1";

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url || url.trim() === "") {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Copy apps/web/.env.example to apps/web/.env.local and set it (e.g. http://localhost:3001).",
    );
  }
  return `${trimTrailingSlashes(url)}${API_PREFIX}`;
}

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  return url && url.trim() !== "" ? trimTrailingSlashes(url) : "http://localhost:3000";
}

/**
 * Media views return relative paths (e.g. `/media/<id>/content`). Expand them
 * to absolute URLs using the configured API base.
 */
export function resolveMediaUrl(path: string, base?: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const origin = base ?? getApiBaseUrl();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}