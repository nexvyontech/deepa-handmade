import { DEFAULT_OPTIONS, PasswordHasherService } from './password-hasher.service.js';

const FAST_OPTIONS = { memoryCost: 1024, timeCost: 2, parallelism: 1 };

describe('PasswordHasherService', () => {
  it('hashes passwords as argon2id encoded hashes', async () => {
    const hasher = new PasswordHasherService(FAST_OPTIONS);

    const hash = await hasher.hash('S3cret-password');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('S3cret-password');
  });

  it('verifies the correct password and rejects wrong ones', async () => {
    const hasher = new PasswordHasherService(FAST_OPTIONS);
    const hash = await hasher.hash('S3cret-password');

    await expect(hasher.verify(hash, 'S3cret-password')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('salts hashes so identical passwords produce different digests', async () => {
    const hasher = new PasswordHasherService(FAST_OPTIONS);

    const [first, second] = await Promise.all([
      hasher.hash('Same-Password-1'),
      hasher.hash('Same-Password-1'),
    ]);

    expect(first).not.toBe(second);
  });

  it('ships the OWASP-recommended default cost parameters', () => {
    expect(DEFAULT_OPTIONS.memoryCost).toBe(65536);
    expect(DEFAULT_OPTIONS.timeCost).toBe(3);
    expect(DEFAULT_OPTIONS.parallelism).toBe(1);
  });
});
