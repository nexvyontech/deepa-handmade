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

const uuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

describe('Cart (e2e)', () => {
  let app: INestApplication;
  let sequence = 0;
  let GUEST_SESSION = '';

  const uniqueMobile = (): string =>
    `8${String(Date.now() % 1_000_000).padStart(6, '0')}${String(sequence++).padStart(4, '0')}`;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const guest = (session = GUEST_SESSION) => ({ 'x-cart-session': session });

  let admin: AuthResponseBody;
  let customerA: AuthResponseBody;
  let customerB: AuthResponseBody;

  let productId: string;
  let variantId: string;
  let otherProductId: string;
  let otherVariantId: string;
  let archivedProductId: string;

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
      name: 'Cart E2E Admin',
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

  async function createProduct(overrides: Record<string, unknown> = {}): Promise<{ id: string; slug: string }> {
    const stamp = `${Date.now().toString(36)}${sequence++}`;
    const res = await http()
      .post('/api/v1/admin/products')
      .set(auth(admin.accessToken))
      .send({
        name: { en: `Cart Product ${stamp}` },
        slug: `cart-product-${stamp}`,
        sku: `CP-${stamp.toUpperCase()}`,
        basePrice: 2000,
        moq: 2,
        status: 'ACTIVE',
        ...overrides,
      })
      .expect(201);
    return { id: res.body.id as string, slug: res.body.slug as string };
  }

  async function createVariant(forProductId: string): Promise<string> {
    const res = await http()
      .post('/api/v1/admin/variants')
      .set(auth(admin.accessToken))
      .send({
        productId: forProductId,
        optionValueIds: [],
        variantSku: `VAR-${forProductId.slice(-6)}-${sequence++}`,
        priceDelta: 300,
      })
      .expect(201);
    return res.body.id as string;
  }

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();
    GUEST_SESSION = uuid();

    admin = await createAdmin();
    customerA = await register('Cart E2E Customer A');
    customerB = await register('Cart E2E Customer B');

    const product = await createProduct();
    productId = product.id;
    variantId = await createVariant(productId);

    const other = await createProduct();
    otherProductId = other.id;
    otherVariantId = await createVariant(otherProductId);

    const archived = await createProduct();
    archivedProductId = archived.id;
    await http()
      .delete(`/api/v1/admin/products/${archivedProductId}`)
      .set(auth(admin.accessToken))
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('guest sessions', () => {
    it('requires a valid session header for guests', async () => {
      await http().get('/api/v1/cart').expect(400);
      await http().get('/api/v1/cart').set(guest('not-a-uuid')).expect(400);
    });

    it('adds a product and computes line totals server-side (201)', async () => {
      const res = await http()
        .post('/api/v1/cart/items')
        .set(guest())
        .send({ productId, qty: 2 })
        .expect(201);
      expect(res.body.identity).toBe('GUEST');
      expect(res.body.items).toHaveLength(1);
      const line = res.body.items[0];
      expect(line).toEqual(
        expect.objectContaining({ productId, qty: 2, unitPrice: 2000, lineTotal: 4000 }),
      );
      expect(res.body.totals.subtotal).toBe(4000);
    });

    it('prices variant lines with the variant delta', async () => {
      await http().delete('/api/v1/cart').set(guest()).expect(200);
      const res = await http()
        .post('/api/v1/cart/items')
        .set(guest())
        .send({ productId, variantId, qty: 2 })
        .expect(201);
      expect(res.body.items[0]).toEqual(
        expect.objectContaining({ variantId, unitPrice: 2300, lineTotal: 4600 }),
      );
    });

    it('rejects a quantity below the product MOQ', async () => {
      await http()
        .post('/api/v1/cart/items')
        .set(guest())
        .send({ productId, qty: 1 })
        .expect(400);
    });

    it('rejects a variant that belongs to another product', async () => {
      await http()
        .post('/api/v1/cart/items')
        .set(guest())
        .send({ productId, variantId: otherVariantId, qty: 2 })
        .expect(400);
    });

    it('rejects an archived product', async () => {
      await http()
        .post('/api/v1/cart/items')
        .set(guest())
        .send({ productId: archivedProductId, qty: 2 })
        .expect(400);
    });

    it('rejects a client-supplied price field', async () => {
      await http()
        .post('/api/v1/cart/items')
        .set(guest())
        .send({ productId: otherProductId, qty: 2, unitPrice: 1 })
        .expect(422);
    });

    it('folds duplicate lines together', async () => {
      await http().delete('/api/v1/cart').set(guest()).expect(200);
      await http().post('/api/v1/cart/items').set(guest()).send({ productId, qty: 2 }).expect(201);
      const res = await http()
        .post('/api/v1/cart/items')
        .set(guest())
        .send({ productId, qty: 3 })
        .expect(201);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].qty).toBe(5);
      expect(res.body.totals.subtotal).toBe(10000);
    });

    it('caps a line at the maximum quantity', async () => {
      const cart = await http().get('/api/v1/cart').set(guest()).expect(200);
      const itemId = cart.body.items[0].id as string;
      await http().patch(`/api/v1/cart/items/${itemId}`).set(guest()).send({ qty: 99 }).expect(200);
      await http()
        .post('/api/v1/cart/items')
        .set(guest())
        .send({ productId, qty: 1 })
        .expect(400);
    });

    it('updates and removes individual lines, then clears the cart', async () => {
      await http().delete('/api/v1/cart').set(guest()).expect(200);
      const added = await http()
        .post('/api/v1/cart/items')
        .set(guest())
        .send({ productId, qty: 2 })
        .expect(201);
      const itemId = added.body.items[0].id as string;

      const updated = await http()
        .patch(`/api/v1/cart/items/${itemId}`)
        .set(guest())
        .send({ qty: 4 })
        .expect(200);
      expect(updated.body.items[0].qty).toBe(4);
      expect(updated.body.totals.subtotal).toBe(8000);

      await http()
        .patch(`/api/v1/cart/items/${itemId}`)
        .set(guest())
        .send({ qty: 1 })
        .expect(400);

      const removed = await http()
        .delete(`/api/v1/cart/items/${itemId}`)
        .set(guest())
        .expect(200);
      expect(removed.body.items).toHaveLength(0);

      await http().post('/api/v1/cart/items').set(guest()).send({ productId, qty: 2 }).expect(201);
      const cleared = await http().delete('/api/v1/cart').set(guest()).expect(200);
      expect(cleared.body.items).toHaveLength(0);
      expect(cleared.body.totals.subtotal).toBe(0);
    });
  });

  describe('server-authoritative revalidation', () => {
    it('refreshes prices and reports PRICE_CHANGED after an admin price change', async () => {
      await http().delete('/api/v1/cart').set(guest()).expect(200);
      await http().post('/api/v1/cart/items').set(guest()).send({ productId, qty: 2 }).expect(201);

      await http()
        .patch(`/api/v1/admin/pricing/products/${productId}`)
        .set(auth(admin.accessToken))
        .send({ basePrice: 2500, mrp: 3000, moq: 2 })
        .expect(200);

      const res = await http().post('/api/v1/cart/validate').set(guest()).expect(201);
      expect(res.body.cart.items[0].unitPrice).toBe(2500);
      expect(res.body.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'PRICE_CHANGED' })]),
      );
    });

    it('drops unavailable lines and reports ITEM_UNAVAILABLE', async () => {
      await http().delete('/api/v1/cart').set(guest()).expect(200);
      await http()
        .post('/api/v1/cart/items')
        .set(guest())
        .send({ productId: otherProductId, qty: 2 })
        .expect(201);
      await http()
        .delete(`/api/v1/admin/products/${otherProductId}`)
        .set(auth(admin.accessToken))
        .expect(200);

      const res = await http().post('/api/v1/cart/validate').set(guest()).expect(201);
      expect(res.body.cart.items).toHaveLength(0);
      expect(res.body.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'ITEM_UNAVAILABLE' })]),
      );
    });

    it('reports CART_EMPTY when validating an empty cart', async () => {
      const res = await http().post('/api/v1/cart/validate').set(guest()).expect(201);
      expect(res.body.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'CART_EMPTY' })]),
      );
    });
  });

  describe('ownership and authenticated carts', () => {
    it('keeps guest, customer A and customer B carts separate', async () => {
      const guestSession = uuid();
      await http()
        .post('/api/v1/cart/items')
        .set(guest(guestSession))
        .send({ productId, qty: 2 })
        .expect(201);

      const cartA = await http().get('/api/v1/cart').set(auth(customerA.accessToken)).expect(200);
      expect(cartA.body.items).toHaveLength(0);

      const cartB = await http().get('/api/v1/cart').set(auth(customerB.accessToken)).expect(200);
      expect(cartB.body.items).toHaveLength(0);

      const guestCart = await http()
        .get('/api/v1/cart')
        .set(guest(guestSession))
        .expect(200);
      expect(guestCart.body.items).toHaveLength(1);
    });

    it('merges a guest cart into the signed-in cart and deletes the guest cart', async () => {
      const session = uuid();
      await http()
        .post('/api/v1/cart/items')
        .set(guest(session))
        .send({ productId, qty: 2 })
        .expect(201);

      await http().delete('/api/v1/cart').set(auth(customerA.accessToken)).expect(200);
      await http()
        .post('/api/v1/cart/items')
        .set(auth(customerA.accessToken))
        .send({ productId, qty: 3 })
        .expect(201);

      const merged = await http()
        .post('/api/v1/cart/merge')
        .set(auth(customerA.accessToken))
        .send({ sessionId: session })
        .expect(201);
      expect(merged.body.identity).toBe('CUSTOMER');
      expect(merged.body.items).toHaveLength(1);
      expect(merged.body.items[0].qty).toBe(5);

      const guestCart = await http().get('/api/v1/cart').set(guest(session)).expect(200);
      expect(guestCart.body.items).toHaveLength(0);
    });

    it('refuses to merge without authentication', async () => {
      await http()
        .post('/api/v1/cart/merge')
        .send({ sessionId: uuid() })
        .expect(401);
    });
  });
});