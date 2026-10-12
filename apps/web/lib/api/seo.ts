import { apiRequest } from "./request";
import type { SeoInput } from "./admin";
import type { SeoEntityType } from "@/lib/constants";
import type { SeoView } from "@/lib/types/api";

/** GET /admin/seo/:entityType/:entityId (product | category | page). */
export function getSeo(entityType: SeoEntityType, entityId: string): Promise<SeoView> {
  return apiRequest<SeoView>({ path: `/admin/seo/${entityType}/${entityId}` });
}

/** PUT /admin/seo/:entityType/:entityId — persists a full SEO block. */
export function updateSeo(
  entityType: SeoEntityType,
  entityId: string,
  input: SeoInput,
): Promise<SeoView> {
  return apiRequest<SeoView>({ method: "PUT", path: `/admin/seo/${entityType}/${entityId}`, body: input });
}