import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES } from '../errors/error-codes.js';
import { ApiException } from '../exceptions/api.exception.js';
import { AccessTokenClaims, AccessTokenPayload } from './access-token.payload.js';
import { parseDurationMs } from './refresh-token.service.js';

export interface IssuedAccessToken {
  token: string;
  /** Seconds until the token expires. */
  expiresIn: number;
}

/**
 * Issues and verifies stateless access tokens.
 *
 * A `JwtService` is instantiated directly (no `JwtModule`) so the signing
 * secret is read from configuration per call; this keeps the module usable in
 * the project's documented no-database/no-secrets boot mode: a missing secret
 * fails with 503 instead of crashing at bootstrap.
 *
 * The guard relies on this service for verification only — no database reads
 * happen per request, so suspension/role changes take effect at the next
 * token issuance (bounded by the access-token TTL).
 */
@Injectable()
export class AccessTokenService {
  private readonly jwt = new JwtService();

  constructor(private readonly config: ConfigService) {}

  private get secret(): string {
    const secret = this.config.get<string>('jwt.accessSecret');
    if (!secret) {
      throw new ApiException(
        503,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'Access token signing is not configured',
      );
    }
    return secret;
  }

  sign(claims: AccessTokenClaims): IssuedAccessToken {
    // Numeric seconds avoid ms-style string literal types; the configured
    // value (`15m`, `900s`, plain milliseconds) is normalised by the parser.
    const ttlSeconds = Math.max(
      1,
      Math.round(parseDurationMs(this.config.get<string>('jwt.accessExpiresIn'), 15 * 60 * 1000) / 1000),
    );
    const token = this.jwt.sign<AccessTokenClaims>({ ...claims }, {
      secret: this.secret,
      expiresIn: ttlSeconds,
    });
    const decoded = this.jwt.decode<AccessTokenPayload>(token);
    const expiresIn = decoded?.exp
      ? decoded.exp - Math.floor(Date.now() / 1000)
      : 0;
    return { token, expiresIn };
  }

  verify(token: string): AccessTokenPayload {
    // Resolve the secret outside try/catch so a missing configuration
    // surfaces as 503 instead of being swallowed as an invalid token.
    const secret = this.secret;
    try {
      return this.jwt.verify<AccessTokenPayload>(token, { secret });
    } catch (error) {
      if ((error as Error | undefined)?.name === 'TokenExpiredError') {
        throw new ApiException(401, ERROR_CODES.TOKEN_EXPIRED, 'Access token has expired');
      }
      throw new ApiException(401, ERROR_CODES.UNAUTHORIZED, 'Invalid access token');
    }
  }
}
