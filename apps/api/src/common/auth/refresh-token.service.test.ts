import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { parseDurationMs, RefreshTokenService } from './refresh-token.service.js';

function configWith(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('RefreshTokenService', () => {
  it('generates unique opaque tokens', () => {
    const service = new RefreshTokenService(configWith({}));
    const a = service.generate();
    const b = service.generate();

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(a, 'base64url')).toHaveLength(32);
  });

  it('stores only the SHA-256 hash of a token', () => {
    const service = new RefreshTokenService(configWith({}));
    const token = service.generate();

    expect(service.hash(token)).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(service.hash(token)).toHaveLength(64);
    expect(service.hash(token)).not.toContain(token);
  });

  it('issues a token with hash and expiry derived from configuration', () => {
    const service = new RefreshTokenService(
      configWith({ 'jwt.refreshExpiresIn': '7d' }),
    );
    const before = Date.now();

    const issued = service.issue();

    expect(service.hash(issued.token)).toBe(issued.tokenHash);
    expect(issued.expiresAt).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000);
    expect(issued.expiresAt).toBeLessThanOrEqual(Date.now() + 7 * 24 * 60 * 60 * 1000);
  });

  it('falls back to a 7 day TTL when configuration is missing', () => {
    const service = new RefreshTokenService(configWith({}));
    expect(service.ttlMs()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('parseDurationMs', () => {
  it('parses JWT-style durations', () => {
    expect(parseDurationMs('30s', 0)).toBe(30_000);
    expect(parseDurationMs('15m', 0)).toBe(900_000);
    expect(parseDurationMs('12h', 0)).toBe(43_200_000);
    expect(parseDurationMs('7d', 0)).toBe(604_800_000);
    expect(parseDurationMs('2w', 0)).toBe(1_209_600_000);
    expect(parseDurationMs('500ms', 0)).toBe(500);
  });

  it('accepts plain millisecond values', () => {
    expect(parseDurationMs('1500', 0)).toBe(1500);
  });

  it('returns the fallback for missing or unparseable input', () => {
    expect(parseDurationMs(undefined, 42)).toBe(42);
    expect(parseDurationMs('', 42)).toBe(42);
    expect(parseDurationMs('soon', 42)).toBe(42);
  });
});
