export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Turn free text into a URL-safe slug: lowercase, strip diacritics, replace
 * non-alphanumeric runs with single hyphens. Returns '' when nothing
 * survives (e.g. input is entirely non-Latin script).
 */
export function toSlug(input: string): string {
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized;
}