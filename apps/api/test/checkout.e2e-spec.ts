import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ALL_PERMISSIONS, ROLES } from '@deepa/shared';
import * as argon2 from 'argon2';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';

interface AuthResponseBody {
  accessToken: string;
  user: { id: string; mobile: string; role: string };
}

const SHIPPING = { mode: 'FLAT_FREE_THRESHOLD', flatFee: 99, freeThreshold: 1499 };

const uuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

describe('Checkout (e2e)', () => {
  let app: INestApplication;
  let sequence = 0;

  const uniqueMobile = (): string =>
    `6${String(Date.now() % 1_000_000).padStart(6, '0')}${String(sequence++).padStart(4, '0')}`;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const guest = (session: string) => ({ 'x-cart-session': session });

  let admin: AuthResponseBody;
  let customer: AuthResponseBody;
  let productId: string;
  let addressId: string;
  let settingsBackup: unknown[] = [];

  const inlineAddress = (overrides: Record<string, unknown> = {}) => ({
    recipient: 'Lakshmi Devi',
    mobile: '9876543210',
    line1: '7 Weaver Lane',
    villageTown: 'Kanchipuram',
    district: 'Kanchipuram',
    state: 'Tamil Nadu',
    pincode: '631501',
    ...overrides,
  });

  async function createAdmin(): Promise<AuthResponseBody> {
    const roles = app.get(getModelToken('Role'));
    const users = app.get(getModelToken('User'));
    let role = await roles.findOne({ code: ROLES.SUPER_ADMIN });
    if (!role) {
      role = await roles.create({
        name: 'Super Admin',
        code: ROLES.SUPER_ADMIN,
        permissions: [],
        isSystem: true,
      });
    }
    await roles.updateOne({ _id: role._id }, { $set: { permissions: [...ALL_PERMISSIONS] } });

    const mobile = uniqueMobile();
    const password = 'AdminPass1';
    await users.create({
      profileType: 'STAFF',
      name: 'Checkout E2E Admin',
      mobile,
      passwordHash: await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 4096,
        timeCost: 2,
        parallelism: 1,
      }),
      roleId: role._id,
      status: 'ACTIVE',
    });
    const login = await http().post('/api/v1/auth/login').send({ mobile, password }).expect(200);
    return login.body as AuthResponseBody;
  }

  async function register(name: string): Promise<AuthResponseBody> {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ name, mobile: uniqueMobile(), password: 'Passw0rd!' })
      .expect(201);
    return res.body as AuthResponseBody;
  }

  async function createProduct(): Promise<string> {
    const stamp = `${Date.now().toString(36)}${sequence++}`;
    const res = await http()
      .post('/api/v1/admin/products')
      .set(auth(admin.accessToken))
      .send({
        name: { en: `Checkout Product ${stamp}` },
        slug: `checkout-product-${stamp}`,
        sku: `CO-${stamp.toUpperCase()}`,
        basePrice: 500,
        moq: 1,
        status: 'ACTIVE',
      })
      .expect(201);
    return res.body.id as string;
  }

  async function ordersCount(): Promise<number> {
    const cart = app.get(getModelToken('Cart'));
    return cart.db.collection('orders').countDocuments();
  }

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();

    const settings = app.get(getModelToken('SiteSetting'));
    settingsBackup = await settings.find({}).lean();
    await settings.deleteMany({});
    await settings.create({
      business: { name: 'Deepa Handmade' },
      shipping: SHIPPING,
      upi: { enabled: true, instructions: { en: 'Pay using any UPI app' } },
    });

    admin = await createAdmin();
    customer = await register('Checkout E2E Customer');
    productId = await createProduct();

    const address = await http()
      .post('/api/v1/addresses')
      .set(auth(customer.accessToken))
      .send(inlineAddress())
      .expect(201);
    addressId = address.body.id as string;
  });

  afterAll(async () => {
    try {
      const settings = app.get(getModelToken('SiteSetting'));
      await settings.deleteMany({});
      if (settingsBackup.length) {
        await settings.insertMany(settingsBackup);
      }
    } finally {
      await app.close();
    }
  });

  it('rejects an empty cart', async () => {
    await http()
      .post('/api/v1/checkout/prepare')
      .set(guest(uuid()))
      .send({ address: inlineAddress() })
      .expect(400);
  });

  it('rejects a guest that tries to use a saved address id', async () => {
    const session = uuid();
    await http()
      .post('/api/v1/cart/items')
      .set(guest(session))
      .send({ productId, qty: 1 })
      .expect(201);
    await http()
      .post('/api/v1/checkout/prepare')
      .set(guest(session))
      .send({ addressId })
      .expect(400);
  });

  it('requires a delivery address', async () => {
    const session = uuid();
    await http()
      .post('/api/v1/cart/items')
      .set(guest(session))
      .send({ productId, qty: 1 })
      .expect(201);
    await http()
      .post('/api/v1/checkout/prepare')
      .set(guest(session))
      .send({})
      .expect(400);
  });

  it('validates the inline delivery address', async () => {
    const session = uuid();
    await http()
      .post('/api/v1/cart/items')
      .set(guest(session))
      .send({ productId, qty: 1 })
      .expect(201);
    await http()
      .post('/api/v1/checkout/prepare')
      .set(guest(session))
      .send({ address: inlineAddress({ pincode: 'abc' }) })
      .expect(422);
  });

  it('prepares a guest checkout with flat-fee shipping and creates no order', async () => {
    const session = uuid();
    await http()
      .post('/api/v1/cart/items')
      .set(guest(session))
      .send({ productId, qty: 1 })
      .expect(201);

    const before = await ordersCount();
    const res = await http()
      .post('/api/v1/checkout/prepare')
      .set(guest(session))
      .send({ address: inlineAddress() })
      .expect(201);

    expect(res.body.valid).toBe(true);
    expect(res.body.address).toEqual(
      expect.objectContaining({ recipient: 'Lakshmi Devi', pincode: '631501' }),
    );
    expect(res.body.address.addressId).toBeUndefined();
    expect(res.body.summary.subtotal).toBe(500);
    expect(res.body.summary.shipping).toBe(99);
    expect(res.body.summary.grandTotal).toBe(599);
    expect(res.body.shipping).toEqual(
      expect.objectContaining({ method: 'FLAT_FREE_THRESHOLD', shipping: 99 }),
    );
    expect(await ordersCount()).toBe(before);
  });

  it('waives shipping above the free threshold', async () => {
    const session = uuid();
    await http()
      .post('/api/v1/cart/items')
      .set(guest(session))
      .send({ productId, qty: 4 })
      .expect(201);
    const res = await http()
      .post('/api/v1/checkout/prepare')
      .set(guest(session))
      .send({ address: inlineAddress() })
      .expect(201);
    expect(res.body.summary.subtotal).toBe(2000);
    expect(res.body.summary.shipping).toBe(0);
    expect(res.body.summary.grandTotal).toBe(2000);
  });

  it('prepares a signed-in checkout using a saved address', async () => {
    await http().delete('/api/v1/cart').set(auth(customer.accessToken)).expect(200);
    await http()
      .post('/api/v1/cart/items')
      .set(auth(customer.accessToken))
      .send({ productId, qty: 1 })
      .expect(201);

    const res = await http()
      .post('/api/v1/checkout/prepare')
      .set(auth(customer.accessToken))
      .send({ addressId })
      .expect(201);

    expect(res.body.valid).toBe(true);
    expect(res.body.address.addressId).toBe(addressId);
    expect(res.body.cart.identity).toBe('CUSTOMER');
    expect(res.body.summary.subtotal).toBe(500);
  });

  it('does not expose any payment method fields (out of scope for this phase)', async () => {
    await http()
      .post('/api/v1/cart/items')
      .set(auth(customer.accessToken))
      .send({ productId, qty: 1 })
      .expect(201);
    const res = await http()
      .post('/api/v1/checkout/prepare')
      .set(auth(customer.accessToken))
      .send({ addressId })
      .expect(201);
    expect(JSON.stringify(res.body)).not.toMatch(/paymentMethods|orderId|codEnabled/);
  });
});