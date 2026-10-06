import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES } from '../errors/error-codes.js';
import { AccessTokenService } from './token.service.js';

function configWith(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('AccessTokenService', () => {
  const secret = 'unit-test-access-secret';

  it('round-trips claims through sign/verify', () => {
    const service = new AccessTokenService(configWith({ 'jwt.accessSecret': secret }));

    const issued = service.sign({
      sub: 'user-1',
      role: 'SUPER_ADMIN',
      permissions: ['staff.manage'],
      sessionId: 'session-1',
    });

    expect(typeof issued.token).toBe('string');
    expect(issued.expiresIn).toBeGreaterThan(0);
    expect(issued.expiresIn).toBeLessThanOrEqual(900);

    const payload = service.verify(issued.token);
    const claims = payload as unknown as Record<string, unknown>;
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('SUPER_ADMIN');
    expect(payload.permissions).toEqual(['staff.manage']);
    expect(payload.sessionId).toBe('session-1');
    expect(claims.iss).toBeUndefined();
    expect(claims.aud).toBeUndefined();
    expect(claims.tokenVersion).toBeUndefined();
  });

  it('rejects tokens signed with a different secret', () => {
    const service = new AccessTokenService(configWith({ 'jwt.accessSecret': secret }));
    const foreign = new JwtService().sign(
      { sub: 'user-1', role: 'CUSTOMER', permissions: [] },
      { secret: 'another-secret', expiresIn: 900 },
    );

    expect(() => service.verify(foreign)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.UNAUTHORIZED }),
    );
  });

  it('maps expired tokens to TOKEN_EXPIRED', () => {
    const service = new AccessTokenService(configWith({ 'jwt.accessSecret': secret }));
    const expired = new JwtService().sign(
      { sub: 'user-1', role: 'CUSTOMER', permissions: [] },
      { secret, expiresIn: -30 },
    );

    expect(() => service.verify(expired)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.TOKEN_EXPIRED }),
    );
  });

  it('fails with 503 when no signing secret is configured', () => {
    const service = new AccessTokenService(configWith({ 'jwt.accessSecret': '' }));

    expect(() => service.sign({ sub: 'user-1', role: 'CUSTOMER', permissions: [] })).toThrow(
      expect.objectContaining({ code: ERROR_CODES.SERVICE_UNAVAILABLE }),
    );
    expect(() => service.verify('some.jwt')).toThrow(
      expect.objectContaining({ code: ERROR_CODES.SERVICE_UNAVAILABLE }),
    );
  });

  it('reads the access-token TTL from configuration', () => {
    const service = new AccessTokenService(
      configWith({ 'jwt.accessSecret': secret, 'jwt.accessExpiresIn': '2m' }),
    );

    const issued = service.sign({ sub: 'user-1', role: 'CUSTOMER', permissions: [] });
    expect(issued.expiresIn).toBe(120);
  });
});
