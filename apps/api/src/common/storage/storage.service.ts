import type { Readable } from 'node:stream';

/**
 * Storage abstraction boundary (Phase 5).
 *
 * Application code (media service, controllers) only ever talks to this
 * interface; `LocalStorageService` backs development/test and
 * `R2StorageService` (Cloudflare R2, S3-compatible) backs production. The
 * provider is chosen by `STORAGE_PROVIDER` in `StorageModule`, never at the
 * call site.
 *
 * Keys are opaque, server-generated, owner-scoped names
 * (`<ownertype>/<uuid>.<ext>`); callers never pass filesystem paths or URLs.
 */
export abstract class StorageService {
  abstract readonly provider: 'local' | 'r2';

  /** Persist bytes under an opaque key. Overwrites if the key exists. */
  abstract put(key: string, data: Buffer, contentType: string): Promise<void>;

  /** Read an object back as a stream. Throws NOT_FOUND when absent. */
  abstract get(key: string): Promise<Readable>;

  /** Delete an object. Missing objects resolve without error. */
  abstract remove(key: string): Promise<void>;

  /**
   * Direct public URL when the backend can serve reads without the API
   * (e.g. R2 public bucket / CDN host), otherwise `null` and the caller
   * streams the object through the API content endpoint.
   */
  abstract publicUrl(key: string): string | null;
}
