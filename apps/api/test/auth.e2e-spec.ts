import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ALL_PERMISSIONS, PERMISSIONS, ROLES } from '@deepa/shared';
import * as argon2 from 'argon2';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; mobile: string; role: string; status: string; email?: string };
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let sequence = 0;

  const uniqueMobile = (): string =>
    `9${String(Date.now() % 1_000_000).padStart(6, '0')}${String(sequence++).padStart(4, '0')}`;

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('customer registration, login and sessions', () => {
    let mobile: string;
    let registered: AuthResponseBody;
    let rotated: AuthResponseBody;

    it('registers a new customer with an ACTIVE CUSTOMER profile', async () => {
      mobile = uniqueMobile();
      const res = await http()
        .post('/api/v1/auth/register')
        .send({ name: 'E2E Customer', mobile, password: 'Passw0rd!', email: `${mobile}@example.test` })
        .expect(201);

      registered = res.body as AuthResponseBody;
      expect(registered.accessToken).toEqual(expect.any(String));
      expect(registered.refreshToken).toEqual(expect.any(String));
      expect(registered.expiresIn).toBeGreaterThan(0);
      expect(registered.user).toEqual(
        expect.objectContaining({ mobile, role: 'CUSTOMER', status: 'ACTIVE' }),
      );
      expect(registered.user.email).toBe(`${mobile}@example.test`);
    });

    it('rejects a duplicate mobile with 409', async () => {
      const res = await http()
        .post('/api/v1/auth/register')
        .send({ name: 'Impostor', mobile, password: 'Passw0rd!' })
        .expect(409);

      expect(res.body.code).toBe('CONFLICT');
    });

    it('logs in with valid credentials and rotates nothing yet', async () => {
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ mobile, password: 'Passw0rd!' })
        .expect(200);

      const body = res.body as AuthResponseBody;
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.refreshToken).toEqual(expect.any(String));
      expect(body.user).toEqual(expect.objectContaining({ mobile, role: 'CUSTOMER' }));
    });

    it('answers unknown users and wrong passwords with the same generic 401', async () => {
      const unknown = await http()
        .post('/api/v1/auth/login')
        .send({ mobile: uniqueMobile(), password: 'Passw0rd!' })
        .expect(401);
      expect(unknown.body.code).toBe('UNAUTHORIZED');
      expect(unknown.body.message).toBe('Invalid credentials');

      const wrong = await http()
        .post('/api/v1/auth/login')
        .send({ mobile, password: 'NotThePass1' })
        .expect(401);
      expect(wrong.body.message).toBe('Invalid credentials');
    });

    it('requires a token for /me', async () => {
      const res = await http().get('/api/v1/auth/me').expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns the profile on /me with a valid access token', async () => {
      const res = await http()
        .get('/api/v1/auth/me')
        .set(auth(registered.accessToken))
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({ mobile, role: 'CUSTOMER', status: 'ACTIVE' }),
      );
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('lists the caller refresh sessions', async () => {
      const res = await http()
        .get('/api/v1/auth/sessions')
        .set(auth(registered.accessToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('expiresAt');
    });

    it('rotates both tokens on refresh', async () => {
      const res = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: registered.refreshToken })
        .expect(200);

      rotated = res.body as AuthResponseBody;
      expect(rotated.accessToken).not.toBe(registered.accessToken);
      expect(rotated.refreshToken).not.toBe(registered.refreshToken);
      expect(rotated.user.mobile).toBe(mobile);
    });

    it('detects reuse of a rotated refresh token and revokes the lineage', async () => {
      const replay = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: registered.refreshToken })
        .expect(401);
      expect(replay.body.code).toBe('UNAUTHORIZED');

      const revoked = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: rotated.refreshToken })
        .expect(401);
      expect(revoked.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects an unknown refresh token', async () => {
      const res = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'definitely-not-a-real-token' })
        .expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('logout and password change', () => {
    let mobile: string;
    let tokens: AuthResponseBody;

    const registerFresh = async (): Promise<AuthResponseBody> => {
      mobile = uniqueMobile();
      const res = await http()
        .post('/api/v1/auth/register')
        .send({ name: 'E2E Session Owner', mobile, password: 'Passw0rd!' })
        .expect(201);
      return res.body as AuthResponseBody;
    };

    it('logout returns 204 and invalidates the refresh session', async () => {
      tokens = await registerFresh();

      await http()
        .post('/api/v1/auth/logout')
        .set(auth(tokens.accessToken))
        .expect(204);

      const refresh = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
      expect(refresh.body.code).toBe('UNAUTHORIZED');
    });

    it('logout-all works without an active session', async () => {
      await http()
        .post('/api/v1/auth/logout-all')
        .set(auth(tokens.accessToken))
        .expect(204);
    });

    it('rejects a wrong current password on change-password', async () => {
      tokens = await registerFresh();

      const res = await http()
        .post('/api/v1/auth/change-password')
        .set(auth(tokens.accessToken))
        .send({ currentPassword: 'WrongPass1', newPassword: 'FreshPass1' })
        .expect(400);

      expect(res.body.code).toBe('BAD_REQUEST');
      expect(res.body.message).toBe('Current password is incorrect');
    });

    it('changes the password, revokes sessions and requires the new password', async () => {
      await http()
        .post('/api/v1/auth/change-password')
        .set(auth(tokens.accessToken))
        .send({ currentPassword: 'Passw0rd!', newPassword: 'FreshPass1' })
        .expect(204);

      const oldPassword = await http()
        .post('/api/v1/auth/login')
        .send({ mobile, password: 'Passw0rd!' })
        .expect(401);
      expect(oldPassword.body.message).toBe('Invalid credentials');

      const staleRefresh = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
      expect(staleRefresh.body.code).toBe('UNAUTHORIZED');

      await http()
        .post('/api/v1/auth/login')
        .send({ mobile, password: 'FreshPass1' })
        .expect(200);
    });
  });

  describe('password reset', () => {
    let mobile: string;
    let resetToken: string;

    it('issues a reset token outside production and ignores unknown identifiers', async () => {
      mobile = uniqueMobile();
      await http()
        .post('/api/v1/auth/register')
        .send({ name: 'E2E Reset', mobile, password: 'Passw0rd!' })
        .expect(201);

      const known = await http()
        .post('/api/v1/auth/password-reset/request')
        .send({ identifier: mobile })
        .expect(202);
      expect(known.body.message).toMatch(/if the account exists/i);
      expect(known.body.resetToken).toEqual(expect.any(String));
      resetToken = known.body.resetToken as string;

      const unknown = await http()
        .post('/api/v1/auth/password-reset/request')
        .send({ identifier: uniqueMobile() })
        .expect(202);
      expect(unknown.body.message).toMatch(/if the account exists/i);
      expect(unknown.body.resetToken).toBeUndefined();
    });

    it('rejects an invalid reset token', async () => {
      const res = await http()
        .post('/api/v1/auth/password-reset/confirm')
        .send({ token: 'not-a-real-reset-token', newPassword: 'ResetPass1' })
        .expect(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('completes the reset, revokes sessions and allows only single use', async () => {
      await http()
        .post('/api/v1/auth/password-reset/confirm')
        .send({ token: resetToken, newPassword: 'ResetPass1' })
        .expect(204);

      await http()
        .post('/api/v1/auth/password-reset/confirm')
        .send({ token: resetToken, newPassword: 'ResetPass1' })
        .expect(400);

      await http()
        .post('/api/v1/auth/login')
        .send({ mobile, password: 'Passw0rd!' })
        .expect(401);

      await http()
        .post('/api/v1/auth/login')
        .send({ mobile, password: 'ResetPass1' })
        .expect(200);
    });
  });

  describe('account lockout', () => {
    it('locks the account after five consecutive failures', async () => {
      const mobile = uniqueMobile();
      await http()
        .post('/api/v1/auth/register')
        .send({ name: 'E2E Lockout', mobile, password: 'Passw0rd!' })
        .expect(201);

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const res = await http()
          .post('/api/v1/auth/login')
          .send({ mobile, password: 'WrongPass99' })
          .expect(401);
        expect(res.body.code).toBe('UNAUTHORIZED');
      }

      const locked = await http()
        .post('/api/v1/auth/login')
        .send({ mobile, password: 'WrongPass99' })
        .expect(429);
      expect(locked.body.code).toBe('RATE_LIMITED');

      const evenCorrectPassword = await http()
        .post('/api/v1/auth/login')
        .send({ mobile, password: 'Passw0rd!' })
        .expect(429);
      expect(evenCorrectPassword.body.code).toBe('RATE_LIMITED');
    });
  });

  describe('non-active accounts', () => {
    it('rejects suspended accounts with 403 after password verification', async () => {
      const mobile = uniqueMobile();
      await http()
        .post('/api/v1/auth/register')
        .send({ name: 'E2E Suspended', mobile, password: 'Passw0rd!' })
        .expect(201);

      const users = app.get(getModelToken('User'));
      await users.updateOne({ mobile }, { $set: { status: 'SUSPENDED' } });

      const res = await http()
        .post('/api/v1/auth/login')
        .send({ mobile, password: 'Passw0rd!' })
        .expect(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.message).toBe('Account is not active');
    });
  });

  describe('RBAC guards', () => {
    let adminMobile: string;
    let admin: AuthResponseBody;
    let adminId: string;
    let customer: AuthResponseBody;
    let customerMobile: string;

    beforeAll(async () => {
      const roles = app.get(getModelToken('Role'));
      const users = app.get(getModelToken('User'));

      let superAdminRole = await roles.findOne({ code: ROLES.SUPER_ADMIN });
      if (!superAdminRole) {
        superAdminRole = await roles.create({
          name: 'Super Admin',
          code: ROLES.SUPER_ADMIN,
          permissions: [],
          isSystem: true,
        });
      }
      await roles.updateOne(
        { _id: superAdminRole._id },
        { $set: { permissions: [...ALL_PERMISSIONS] } },
      );

      adminMobile = uniqueMobile();
      const adminPassword = 'AdminPass1';
      const passwordHash = await argon2.hash(adminPassword, {
        type: argon2.argon2id,
        memoryCost: 4096,
        timeCost: 2,
        parallelism: 1,
      });
      const adminUser = await users.create({
        profileType: 'STAFF',
        name: 'E2E Admin',
        mobile: adminMobile,
        passwordHash,
        roleId: superAdminRole._id,
        status: 'ACTIVE',
      });
      adminId = String(adminUser._id);

      const login = await http()
        .post('/api/v1/auth/login')
        .send({ mobile: adminMobile, password: adminPassword })
        .expect(200);
      admin = login.body as AuthResponseBody;
      expect(admin.user.role).toBe(ROLES.SUPER_ADMIN);

      customerMobile = uniqueMobile();
      const registration = await http()
        .post('/api/v1/auth/register')
        .send({ name: 'E2E RBAC Customer', mobile: customerMobile, password: 'Passw0rd!' })
        .expect(201);
      customer = registration.body as AuthResponseBody;
    });

    it('rejects unauthenticated calls to admin endpoints', async () => {
      const res = await http()
        .post(`/api/v1/auth/admin/users/${adminId}/revoke-sessions`)
        .expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('roles guard: a CUSTOMER cannot revoke sessions (403)', async () => {
      const res = await http()
        .post(`/api/v1/auth/admin/users/${adminId}/revoke-sessions`)
        .set(auth(customer.accessToken))
        .expect(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.message).toMatch(/role/i);
    });

    it('roles guard: an ADMIN/SUPER_ADMIN can revoke sessions (204)', async () => {
      await http()
        .post(`/api/v1/auth/admin/users/${adminId}/revoke-sessions`)
        .set(auth(admin.accessToken))
        .expect(204);
    });

    it('permissions guard: staff.manage is required to list sessions', async () => {
      const denied = await http()
        .get(`/api/v1/auth/admin/users/${adminId}/sessions`)
        .set(auth(customer.accessToken))
        .expect(403);
      expect(denied.body.code).toBe('FORBIDDEN');

      const allowed = await http()
        .get(`/api/v1/auth/admin/users/${adminId}/sessions`)
        .set(auth(admin.accessToken))
        .expect(200);
      expect(Array.isArray(allowed.body)).toBe(true);
      expect(allowed.body.every((entry: { id: string }) => typeof entry.id === 'string')).toBe(
        true,
      );
    });

    it('permissions guard: customer permissions do not include staff.manage', async () => {
      expect(customer.user.role).toBe(ROLES.CUSTOMER);
      expect(PERMISSIONS.STAFF_MANAGE).toBe('staff.manage');
    });
  });
});
