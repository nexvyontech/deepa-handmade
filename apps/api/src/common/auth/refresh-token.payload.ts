/**
 * Refresh-token payload shape (phase 4).
 *
 * Refresh tokens are opaque 256-bit random values, not JWTs. They are stored
 * only as a SHA-256 hash (`tokenHash`) on the UserRefreshToken document. This
 * payload describes the claims the auth service attaches to a rotated session
 * so the family/rotation logic has everything it needs without trusting client
 * input.
 */

export interface RefreshTokenClaims {
  /** User id that owns the session. */
  userId: string;
  /** Opaque token value (never persisted in plaintext). */
  token: string;
  /** Millisecond timestamp at which the session expires. */
  expiresAt: number;
  /** True every time a brand-new session/family is minted. */
  fresh?: boolean;
}
