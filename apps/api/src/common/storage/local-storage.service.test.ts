import { buildStorageKey, LocalStorageService } from './local-storage.service.js';
import { StorageService } from './storage.service.js';

function storage(root: string): StorageService {
  return new LocalStorageService(root);
}

describe('buildStorageKey', () => {
  it('produces an owner-preixed uuid key with a lowercase extension', () => {
    const key = buildStorageKey('PRODUCT', 'JPG');
    expect(key).toMatch(/^product\/[0-9a-f-]{36}\.jpg$/);
  });

  it('produces distinct keys per call', () => {
    expect(buildStorageKey('product', 'png')).not.toBe(buildStorageKey('product', 'png'));
  });
});

describe('LocalStorageService', () => {
  it('rejects keys that traverse outside the root', () => {
    const service = storage('C:/tmp/root');
    // @ts-expect-error resolveKey is private by design; exercise via public ops
    expect(() => service.resolveKey('product/../../../etc/passwd')).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('rejects keys with unexpected shape', () => {
    const service = storage('C:/tmp/root');
    // @ts-expect-error resolveKey is private by design
    expect(() => service.resolveKey('nested/dir/file.png')).toThrow(expect.objectContaining({ status: 400 }));
    // @ts-expect-error resolveKey is private by design
    expect(() => service.resolveKey('file.png')).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('never exposes a public URL in local mode', () => {
    expect(storage('C:/tmp/root').publicUrl('product/x.png')).toBeNull();
  });

  it('reports the local provider', () => {
    expect(storage('C:/tmp/root').provider).toBe('local');
  });

  it('put/get/remove round-trips bytes', async () => {
    const service = storage('C:/tmp/roundtrip');
    const key = buildStorageKey('product', 'png');
    await service.put(key, Buffer.from('png-bytes'), 'image/png');
    const stream = await service.get(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('png-bytes');
    await service.remove(key);
    await expect(service.get(key)).rejects.toThrow(expect.objectContaining({ status: 404 }));
  });
});