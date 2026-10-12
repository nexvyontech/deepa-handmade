import { apiRequest } from "./request";
import type { QueryParams } from "./request";
import type { MediaBucket, MediaStatus, OwnerType } from "@/lib/constants";
import type { MediaView, Paginated } from "@/lib/types/api";

export interface UploadMediaInput {
  file: File;
  ownerType: OwnerType | string;
  ownerId: string;
  bucket?: MediaBucket;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface UpdateMediaInput {
  alt?: { en?: string; ta?: string };
  sortOrder?: number;
  isPrimary?: boolean;
  status?: MediaStatus;
}

export interface MediaListQuery extends QueryParams {
  ownerType?: string;
  ownerId?: string;
  status?: MediaStatus;
  bucket?: MediaBucket;
  page?: number;
  limit?: number;
}

/** POST /media/upload — multipart. Frontend pre-validates images (UX only; the API re-validates). */
export function uploadMedia(input: UploadMediaInput): Promise<MediaView> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("ownerType", input.ownerType);
  form.append("ownerId", input.ownerId);
  if (input.bucket) form.append("bucket", input.bucket);
  if (input.isPrimary !== undefined) form.append("isPrimary", String(input.isPrimary));
  if (input.sortOrder !== undefined) form.append("sortOrder", String(input.sortOrder));
  return apiRequest<MediaView>({ method: "POST", path: "/media/upload", formData: form });
}

/** GET /media — filterable media library. */
export function listMedia(query: MediaListQuery): Promise<Paginated<MediaView>> {
  return apiRequest<Paginated<MediaView>>({ path: "/media", query });
}

export function getMedia(id: string): Promise<MediaView> {
  return apiRequest<MediaView>({ path: `/media/${id}` });
}

export function updateMedia(id: string, input: UpdateMediaInput): Promise<MediaView> {
  return apiRequest<MediaView>({ method: "PATCH", path: `/media/${id}`, body: input });
}

export function deleteMedia(id: string): Promise<void> {
  return apiRequest<void>({ method: "DELETE", path: `/media/${id}` });
}

/** GET /admin/products/:id/media — media attached to a product, ordered. */
export function listProductMedia(productId: string): Promise<MediaView[]> {
  return apiRequest<MediaView[]>({ path: `/admin/products/${productId}/media` });
}

/** PUT /admin/products/:id/media — reorder to an exact set of mediaIds. */
export function setProductMediaOrder(productId: string, mediaIds: string[]): Promise<MediaView[]> {
  return apiRequest<MediaView[]>({ method: "PUT", path: `/admin/products/${productId}/media`, body: { mediaIds } });
}

/** DELETE /admin/products/:id/media/:mediaId — detach (marks the media HIDDEN). */
export function detachProductMedia(productId: string, mediaId: string): Promise<MediaView> {
  return apiRequest<MediaView>({ method: "DELETE", path: `/admin/products/${productId}/media/${mediaId}` });
}