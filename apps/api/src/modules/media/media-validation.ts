import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { ApiException } from '../../common/exceptions/api.exception.js';

export type MediaKind = 'IMAGE' | 'VIDEO';

export const MEDIA_KINDS: readonly MediaKind[] = ['IMAGE', 'VIDEO'];

export const OWNER_TYPES = [
  'PRODUCT',
  'CATEGORY',
  'BANNER',
  'CMS_PAGE',
  'VARIANT',
  'USER',
  'PAYMENT',
] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

interface TypeSpec {
  mime: string;
  kind: MediaKind;
  extensions: string[];
}

const IMAGE_TYPES: TypeSpec[] = [
  { mime: 'image/jpeg', kind: 'IMAGE', extensions: ['jpg', 'jpeg'] },
  { mime: 'image/png', kind: 'IMAGE', extensions: ['png'] },
  { mime: 'image/webp', kind: 'IMAGE', extensions: ['webp'] },
  { mime: 'image/gif', kind: 'IMAGE', extensions: ['gif'] },
  { mime: 'image/avif', kind: 'IMAGE', extensions: ['avif'] },
];

const VIDEO_TYPES: TypeSpec[] = [
  { mime: 'video/mp4', kind: 'VIDEO', extensions: ['mp4', 'm4v'] },
  { mime: 'video/webm', kind: 'VIDEO', extensions: ['webm'] },
];

/** Allowed upload fingerprints. Declared MIME must match a known type and the
 * file's magic bytes, and the file extension must belong to that type. */
export const ALLOWED_TYPES: readonly TypeSpec[] = [...IMAGE_TYPES, ...VIDEO_TYPES];

export interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ValidatedFile {
  mime: string;
  kind: MediaKind;
  ext: string;
  sizeBytes: number;
}

function sniffMagic(mime: string, buffer: Buffer): boolean {
  const b = buffer;
  switch (mime) {
    case 'image/jpeg':
      return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/png':
      return (
        b.length > 8 &&
        b
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    case 'image/gif': {
      const sig = b.toString('latin1', 0, 6);
      return sig === 'GIF87a' || sig === 'GIF89a';
    }
    case 'image/webp':
      return (
        b.length > 12 &&
        b.toString('latin1', 0, 4) === 'RIFF' &&
        b.toString('latin1', 8, 12) === 'WEBP'
      );
    case 'image/avif':
      return (
        b.length > 12 &&
        b.toString('latin1', 4, 8) === 'ftyp' &&
        ['avif', 'avis'].includes(b.toString('latin1', 8, 12))
      );
    case 'video/mp4':
      return b.length > 12 && b.toString('latin1', 4, 8) === 'ftyp';
    case 'video/webm':
      return b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    default:
      return false;
  }
}

export function unsupported(message: string): ApiException {
  return new ApiException(
    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
    message,
  );
}

/**
 * Server-side upload validation (utility for the media service):
 * - extension must belong to the declared MIME (never trusted on its own),
 * - magic bytes must match the declared MIME (client-supplied MIME alone is
 *   not a security check),
 * - size is capped per kind (image vs video).
 */
export function validateUpload(
  file: UploadFile | undefined,
  limits: { maxImageBytes: number; maxVideoBytes: number },
): ValidatedFile {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw ApiException.badRequest('A non-empty "file" field is required');
  }

  const declared = file.mimetype.toLowerCase();
  const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();

  const specs = ALLOWED_TYPES.filter((spec) => spec.mime === declared);
  if (specs.length === 0) {
    throw unsupported(`Unsupported content type "${declared}"`);
  }
  if (!specs.some((spec) => spec.extensions.includes(ext))) {
    throw unsupported(`Extension ".${ext}" does not match content type "${declared}"`);
  }
  if (!sniffMagic(declared, file.buffer)) {
    throw unsupported('File content does not match its declared type');
  }

  const kind = specs[0].kind;
  const limit = kind === 'VIDEO' ? limits.maxVideoBytes : limits.maxImageBytes;
  if (file.size > limit) {
    throw new ApiException(
      HttpStatus.PAYLOAD_TOO_LARGE,
      ERROR_CODES.PAYLOAD_TOO_LARGE,
      `File exceeds the ${Math.round(limit / 1024 / 1024)}MB limit for ${kind.toLowerCase()} uploads`,
    );
  }

  return { mime: declared, kind, ext, sizeBytes: file.size };
}