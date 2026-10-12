import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';

interface AuthResponseBody {
  accessToken: string;
  user: { id: string; mobile: string; role: string };
}

describe('Addresses (e2e)', () => {
  let app: INestApplication;
  let sequence = 0;

  const uniqueMobile = (): string =>
    `9${String(Date.now() % 1_000_000).padStart(6, '0')}${String(sequence++).padStart(4, '0')}`;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  let customerA: AuthResponseBody;
  let customerB: AuthResponseBody;

  const addressBody = (overrides: Record<string, unknown> = {}) => ({
    recipient: 'Meena Kumari',
    mobile: '9876543210',
    line1: '12 Temple Street',
    villageTown: 'Thanjavur',
    district: 'Thanjavur',
    state: 'Tamil Nadu',
    pincode: '613001',
    ...overrides,
  });

  async function register(name: string): Promise<AuthResponseBody> {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ name, mobile: uniqueMobile(), password: 'Passw0rd!' })
      .expect(201);
    return res.body as AuthResponseBody;
  }

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();
    customerA = await register('Address E2E Customer A');
    customerB = await register('Address E2E Customer B');
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await http().get('/api/v1/addresses').expect(401);
  });

  it('creates the first address as the default', async () => {
    const res = await http()
      .post('/api/v1/addresses')
      .set(auth(customerA.accessToken))
      .send(addressBody())
      .expect(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.isDefault).toBe(true);
    expect(res.body.pincode).toBe('613001');
  });

  it('validates mobile and PIN formats', async () => {
    await http()
      .post('/api/v1/addresses')
      .set(auth(customerA.accessToken))
      .send(addressBody({ mobile: '12345' }))
      .expect(422);
    await http()
      .post('/api/v1/addresses')
      .set(auth(customerA.accessToken))
      .send(addressBody({ pincode: '000000' }))
      .expect(422);
  });

  it('lists, updates, and re-selects the default address', async () => {
    const second = await http()
      .post('/api/v1/addresses')
      .set(auth(customerA.accessToken))
      .send(addressBody({ line1: '44 Market Road', label: 'Work', isDefault: false }))
      .expect(201);
    expect(second.body.isDefault).toBe(false);

    const listed = await http()
      .get('/api/v1/addresses')
      .set(auth(customerA.accessToken))
      .expect(200);
    expect(listed.body.length).toBeGreaterThanOrEqual(2);

    await http()
      .patch(`/api/v1/addresses/${second.body.id}`)
      .set(auth(customerA.accessToken))
      .send({ landmark: 'Near the big banyan tree' })
      .expect(200);

    const madeDefault = await http()
      .post(`/api/v1/addresses/${second.body.id}/default`)
      .set(auth(customerA.accessToken))
      .expect(201);
    expect(madeDefault.body.isDefault).toBe(true);

    const after = await http()
      .get('/api/v1/addresses')
      .set(auth(customerA.accessToken))
      .expect(200);
    const defaults = after.body.filter((a: { isDefault: boolean }) => a.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(second.body.id);
  });

  it('soft-deletes an address', async () => {
    const created = await http()
      .post('/api/v1/addresses')
      .set(auth(customerA.accessToken))
      .send(addressBody({ line1: '55 River Bank', label: 'Temp' }))
      .expect(201);

    await http()
      .delete(`/api/v1/addresses/${created.body.id}`)
      .set(auth(customerA.accessToken))
      .expect(200);

    const listed = await http()
      .get('/api/v1/addresses')
      .set(auth(customerA.accessToken))
      .expect(200);
    const ids = listed.body.map((a: { id: string }) => a.id);
    expect(ids).not.toContain(created.body.id);
  });

  it('enforces ownership across customers', async () => {
    const owned = await http()
      .post('/api/v1/addresses')
      .set(auth(customerA.accessToken))
      .send(addressBody({ line1: '99 Exclusive Lane' }))
      .expect(201);

    const bList = await http()
      .get('/api/v1/addresses')
      .set(auth(customerB.accessToken))
      .expect(200);
    expect(bList.body).toHaveLength(0);

    await http()
      .patch(`/api/v1/addresses/${owned.body.id}`)
      .set(auth(customerB.accessToken))
      .send({ line1: 'Hijacked' })
      .expect(404);

    await http()
      .delete(`/api/v1/addresses/${owned.body.id}`)
      .set(auth(customerB.accessToken))
      .expect(404);

    await http()
      .post(`/api/v1/addresses/${owned.body.id}/default`)
      .set(auth(customerB.accessToken))
      .expect(404);
  });
});