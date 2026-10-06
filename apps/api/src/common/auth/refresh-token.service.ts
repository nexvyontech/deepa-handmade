import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IssuedRefreshToken {
  /** Opaque base64url token handed to the client (never stored). */
  token: string;
  /** SHA-256 hex digest persisted as `tokenHash`. */
  tokenHash: string;
  /** Unix millisecond timestamp at which the refresh session expires. */
  expiresAt: number;
}

/**
 * Mints opaque refresh tokens and derives their storage hash.
 *
 * Refresh tokens are 256-bit random values (not JWTs); only the SHA-256 hex
 * digest is persisted, so a database leak cannot be replayed against the
 * refresh endpoint.
 */
@Injectable()
export class RefreshTokenService {
  constructor(private readonly config: ConfigService) {}

  generate(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  issue(): IssuedRefreshToken {
    const token = this.generate();
    return {
      token,
      tokenHash: this.hash(token),
      expiresAt: Date.now() + this.ttlMs(),
    };
  }

  /** Refresh-session TTL in milliseconds (from `jwt.refreshExpiresIn`, default 7d). */
  ttlMs(): number {
    return parseDurationMs(
      this.config.get<string>('jwt.refreshExpiresIn'),
      7 * 24 * 60 * 60 * 1000,
    );
  }
}

/** Parses JWT-style durations (`30s`, `15m`, `7d`, plain milliseconds). */
export function parseDurationMs(value: string | undefined, fallbackMs: number): number {
  if (!value || value.trim() === '') return fallbackMs;
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d|w)$/.exec(value.trim());
  if (!match) {
    const plain = Number(value);
    return Number.isNaN(plain) ? fallbackMs : plain;
  }
  const amount = Number(match[1]);
  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return amount * unitMs[match[2]];
}
