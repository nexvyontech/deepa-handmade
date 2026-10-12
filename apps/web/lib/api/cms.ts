import { apiRequest } from "./request";
import type { LocalizedTextInput, SeoInput } from "./admin";
import type { BannerTarget, CmsPageStatus, CmsPageType, PageAction } from "@/lib/constants";
import type { BannerView, CmsPageView } from "@/lib/types/api";

// ---------------------------------------------------------------------- CMS pages

export interface CmsPageCreateInput {
  slug: string;
  type: CmsPageType;
  title: LocalizedTextInput;
  content?: LocalizedTextInput;
  seo?: SeoInput;
  sortOrder?: number;
}

export interface CmsPageUpdateInput {
  slug?: string;
  type?: CmsPageType;
  title?: LocalizedTextInput;
  content?: LocalizedTextInput;
  seo?: SeoInput;
  sortOrder?: number;
}

/** GET /admin/cms/pages?status= */
export function listAdminPages(status?: CmsPageStatus): Promise<CmsPageView[]> {
  return apiRequest<CmsPageView[]>({ path: "/admin/cms/pages", query: status ? { status } : undefined });
}

export function createPage(input: CmsPageCreateInput): Promise<CmsPageView> {
  return apiRequest<CmsPageView>({ method: "POST", path: "/admin/cms/pages", body: input });
}

export function updatePage(id: string, input: CmsPageUpdateInput): Promise<CmsPageView> {
  return apiRequest<CmsPageView>({ method: "PATCH", path: `/admin/cms/pages/${id}`, body: input });
}

/** PATCH /admin/cms/pages/:id/status — publish | unpublish | archive (requires cms.publish). */
export function setPageStatus(id: string, action: PageAction): Promise<CmsPageView> {
  return apiRequest<CmsPageView>({ method: "PATCH", path: `/admin/cms/pages/${id}/status`, body: { action } });
}

/** DELETE /admin/cms/pages/:id — archives the page. */
export function deletePage(id: string): Promise<CmsPageView> {
  return apiRequest<CmsPageView>({ method: "DELETE", path: `/admin/cms/pages/${id}` });
}

// ----------------------------------------------------------------------- banners

export interface BannerCreateInput {
  title?: LocalizedTextInput;
  imageMediaId: string;
  ctaUrl?: string;
  ctaLabel?: LocalizedTextInput;
  target?: BannerTarget;
  location?: string;
  sortOrder?: number;
  active?: boolean;
  startAt?: string;
  endAt?: string;
}

export interface BannerUpdateInput {
  title?: LocalizedTextInput;
  imageMediaId?: string;
  ctaUrl?: string;
  ctaLabel?: LocalizedTextInput;
  target?: BannerTarget;
  location?: string;
  sortOrder?: number;
  active?: boolean;
  startAt?: string;
  endAt?: string;
}

/** GET /admin/cms/banners and GET /admin/banners — same full list. */
export function listAllBanners(): Promise<BannerView[]> {
  return apiRequest<BannerView[]>({ path: "/admin/banners" });
}

export function createBanner(input: BannerCreateInput): Promise<BannerView> {
  return apiRequest<BannerView>({ method: "POST", path: "/admin/banners", body: input });
}

export function updateBanner(id: string, input: BannerUpdateInput): Promise<BannerView> {
  return apiRequest<BannerView>({ method: "PATCH", path: `/admin/banners/${id}`, body: input });
}

export function deleteBanner(id: string): Promise<BannerView> {
  return apiRequest<BannerView>({ method: "DELETE", path: `/admin/banners/${id}` });
}