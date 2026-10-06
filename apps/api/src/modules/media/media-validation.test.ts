import { ERROR_CODES } from '../../common/errors/error-codes.js';
import { validateUpload } from './media-validation.js';

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082',
  'hex',
);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00]);
const MP4 = Buffer.concat([
  Buffer.from('00000018', 'hex'),
  Buffer.from('ftypisom', 'latin1'),
  Buffer.from('00000000', 'hex'),
]);
const GIF = Buffer.from('GIF89a_test_data', 'latin1');
const WEBP = Buffer.concat([Buffer.from('RIFFxxxxWEBP', 'latin1'), Buffer.alloc(4)]);
const AVIF = Buffer.concat([Buffer.from('00000014', 'hex'), Buffer.from('ftypavif', 'latin1'), Buffer.alloc(4)]);

const LIMITS = { maxImageBytes: 10 * 1024 * 1024, maxVideoBytes: 100 * 1024 * 1024 };

function file(overrides: Partial<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>) {
  return {
    originalname: 'photo.png',
    mimetype: 'image/png',
    size: 42,
    buffer: PNG,
    ...overrides,
  };
}

describe('validateUpload', () => {
  it('accepts a genuine PNG image', () => {
    const result = validateUpload(file({}), LIMITS);
    expect(result).toEqual({ mime: 'image/png', kind: 'IMAGE', ext: 'png', sizeBytes: 42 });
  });

  it('accepts jpeg, gif, webp, avif and video fingerprints', () => {
    expect(validateUpload(file({ mimetype: 'image/jpeg', originalname: 'p.jpg', buffer: JPEG }), LIMITS).kind).toBe('IMAGE');
    expect(validateUpload(file({ mimetype: 'image/gif', originalname: 'p.gif', buffer: GIF }), LIMITS).mime).toBe('image/gif');
    expect(validateUpload(file({ mimetype: 'image/webp', originalname: 'p.webp', buffer: WEBP }), LIMITS).mime).toBe('image/webp');
    expect(validateUpload(file({ mimetype: 'image/avif', originalname: 'p.avif', buffer: AVIF }), LIMITS).mime).toBe('image/avif');
    const mp4 = validateUpload(file({ mimetype: 'video/mp4', originalname: 'clip.m4v', buffer: MP4, size: 512 }), LIMITS);
    expect(mp4.kind).toBe('VIDEO');
    expect(validateUpload(file({ mimetype: 'video/webm', originalname: 'clip.webm', buffer: WEBM, size: 512 }), LIMITS).mime).toBe('video/webm');
  });

  it('rejects an unknown declared mime with 415', () => {
    expect(() => validateUpload(file({ mimetype: 'text/plain' }), LIMITS)).toThrow(
      expect.objectContaining({ status: 415, code: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE }),
    );
  });

  it('rejects an extension that does not belong to the declared mime', () => {
    expect(() => validateUpload(file({ originalname: 'photo.exe' }), LIMITS)).toThrow(
      expect.objectContaining({ status: 415 }),
    );
  });

  it('rejects mismatched magic bytes (declared png but not a png)', () => {
    expect(() =>
      validateUpload(file({ buffer: Buffer.from('this is not image data at all!!! longest ever') }), LIMITS),
    ).toThrow(expect.objectContaining({ status: 415, message: expect.stringContaining('does not match') }));
  });

  it('rejects missing or empty files with 400', () => {
    expect(() => validateUpload(undefined, LIMITS)).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => validateUpload(file({ buffer: Buffer.alloc(0), size: 0 }), LIMITS)).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });

  it('rejects an oversized image with 413', () => {
    expect(() =>
      validateUpload(file({ buffer: PNG, size: 11 * 1024 * 1024 }), LIMITS),
    ).toThrow(expect.objectContaining({ status: 413, code: ERROR_CODES.PAYLOAD_TOO_LARGE }));
  });

  it('applies the video limit to video uploads', () => {
    expect(() =>
      validateUpload(
        file({ mimetype: 'video/mp4', originalname: 'clip.mp4', buffer: MP4, size: 101 * 1024 * 1024 }),
        LIMITS,
      ),
    ).toThrow(expect.objectContaining({ status: 413 }));
  });
});