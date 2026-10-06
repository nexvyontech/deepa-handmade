/**
 * Access-token payload (JWT claims) shared by the auth service and guards.
 *
 * Deliberately contains no `iss`/`aud` (the config surface has no such keys)
 * and no `tokenVersion` (the User schema has no version field); revocation
 * is handled by refresh-session records plus the short access-token TTL.
 */

export interface AccessTokenPayload {
  /** User id (Mongo ObjectId string). */
  sub: string;
  /** Canonical role code at issue time. */
  role: string;
  /** Canonical permission codes granted through the user's role(s). */
  permissions: string[];
  /** Refresh-session id, used to revoke the session on logout. */
  sessionId?: string;
  /** Issued-at (seconds, set by signer). */
  iat: number;
  /** Expiry (seconds, set by signer). */
  exp: number;
}

export type AccessTokenClaims = Omit<AccessTokenPayload, 'iat' | 'exp'>;
