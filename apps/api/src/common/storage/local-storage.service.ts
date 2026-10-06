import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { ApiException } from '../exceptions/api.exception.js';
import { StorageService } from './storage.service.js';

/**
 * Keys look like `<owner>/<uuid>.<ext>`: exactly one directory level (the
 * owner type) plus a filename that cannot introduce further separators, so a
 * resolved path can never leave the configured root. A containment check is
 * applied on top as defense in depth.
 */
const KEY_PATTERN = /^[a-z][a-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*\.[a-z0-9]+$/;

export function buildStorageKey(ownerType: string, ext: string): string {
  const owner = ownerType.trim().toLowerCase();
  const safeExt = ext.trim().toLowerCase().replace(/^\./, '');
  return `${owner}/${randomUUID()}.${safeExt}`;
}

export class LocalStorageService extends StorageService {
  readonly provider = 'local' as const;

  private readonly root: string;

  constructor(rootDir: string) {
    super();
    this.root = path.resolve(rootDir);
  }

  private resolveKey(key: string): string {
    if (!KEY_PATTERN.test(key)) {
      throw ApiException.badRequest('Invalid storage key');
    }
    const full = path.resolve(this.root, key);
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw ApiException.badRequest('Invalid storage key');
    }
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolveKey(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async get(key: string): Promise<Readable> {
    const full = this.resolveKey(key);
    try {
      const info = await stat(full);
      if (!info.isFile()) throw new Error('not a file');
    } catch {
      throw ApiException.notFound('Stored object not found');
    }
    return createReadStream(full);
  }

  async remove(key: string): Promise<void> {
    const full = this.resolveKey(key);
    try {
      await rm(full);
    } catch (error) {
      if ((error as { code?: string }).code !== 'ENOENT') throw error;
    }
  }

  publicUrl(): string | null {
    return null;
  }
}
