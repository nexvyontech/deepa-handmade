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

describe('Catalogue (e2e)', () => {
  let app: INestApplication;
  let sequence = 0;

  const uniqueMobile = (): string =>
    `7${String(Date.now() % 1_000_000).padStart(6, '0')}${String(sequence++).padStart(4, '0')}`;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  let admin: AuthResponseBody;
  let customer: AuthResponseBody;

  let categoryId: string;
  let childCategoryId: string;
  let parentSlug: string;
  let childSlug: string;
  let productId: string;
  let productSlug: string;
  let colorOptionId: string;
  let sizeOptionId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();

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

    const adminMobile = uniqueMobile();
    const adminPassword = 'AdminPass1';
    const adminUser = await users.create({
      profileType: 'STAFF',
      name: 'Catalogue E2E Admin',
      mobile: adminMobile,
      passwordHash: await argon2.hash(adminPassword, {
        type: argon2.argon2id,
        memoryCost: 4096,
        timeCost: 2,
        parallelism: 1,
      }),
      roleId: superAdminRole._id,
      status: 'ACTIVE',
    });
    void adminUser;

    const adminLogin = await http()
      .post('/api/v1/auth/login')
      .send({ mobile: adminMobile, password: adminPassword })
      .expect(200);
    admin = adminLogin.body as AuthResponseBody;

    const customerMobile = uniqueMobile();
    const registration = await http()
      .post('/api/v1/auth/register')
      .send({ name: 'Catalogue E2E Customer', mobile: customerMobile, password: 'Passw0rd!' })
      .expect(201);
    customer = registration.body as AuthResponseBody;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('categories', () => {
    it('creates a tree of categories as an admin', async () => {
      const stamp = `${Date.now().toString(36)}${sequence++}`;
      const parent = await http()
        .post('/api/v1/admin/categories')
        .set(auth(admin.accessToken))
        .send({ name: { en: `Wire Baskets ${stamp}`, ta: `கம்பி கூடைகள் ${stamp}` }, slug: `wire-baskets-${stamp}` })
        .expect(201);
      expect(parent.body.id).toEqual(expect.any(String));
      expect(parent.body.active).toBe(true);
      categoryId = parent.body.id as string;

      const child = await http()
        .post('/api/v1/admin/categories')
        .set(auth(admin.accessToken))
        .send({ name: { en: `Round Baskets ${stamp}` }, slug: `round-baskets-${stamp}`, parentId: categoryId })
        .expect(201);
      childCategoryId = child.body.id as string;
      childSlug = child.body.slug as string;
      parentSlug = parent.body.slug as string;
    });

    it('rejects duplicate category slugs with 409', async () => {
      await http()
        .post('/api/v1/admin/categories')
        .set(auth(admin.accessToken))
        .send({ name: { en: 'Duplicate' }, slug: parentSlug })
        .expect(409);
    });

    it('exposes active categories publicly', async () => {
      const res = await http().get('/api/v1/catalog/categories').expect(200);
      const slugs = res.body.map((c: { slug: string }) => c.slug);
      expect(slugs).toContain(parentSlug);
      expect(slugs).toContain(childSlug);
    });

    it('returns 403 for a customer hitting admin category routes', async () => {
      await http()
        .post('/api/v1/admin/categories')
        .set(auth(customer.accessToken))
        .send({ name: { en: 'Nope' } })
        .expect(403);
    });
  });

  describe('variant options', () => {
    it('scopes option values to COLOR and SIZE', async () => {
      const stamp = `${Date.now().toString(36)}${sequence++}`;
      const color = await http()
        .post('/api/v1/admin/options')
        .set(auth(admin.accessToken))
        .send({ optionType: 'COLOR', value: { en: `Natural ${stamp}`, ta: 'இயற்கை' }, hex: '#c8a97e' })
        .expect(201);
      colorOptionId = color.body.id as string;

      const size = await http()
        .post('/api/v1/admin/options')
        .set(auth(admin.accessToken))
        .send({ optionType: 'SIZE', value: { en: `Small ${stamp}` } })
        .expect(201);
      sizeOptionId = size.body.id as string;
    });
  });

  describe('products', () => {
    let productSku: string;

    it('creates a DRAFT product for an admin', async () => {
      const stamp = `${Date.now().toString(36)}${sequence++}`;
      const res = await http()
        .post('/api/v1/admin/products')
        .set(auth(admin.accessToken))
        .send({
          name: { en: `Kudai Round Basket ${stamp}`, ta: 'கூடை' },
          slug: `kudai-round-basket-${stamp}`,
          sku: `KB-ROUND-${stamp.toUpperCase()}`,
          shortDesc: 'Handmade round basket',
          basePrice: 2500,
          mrp: 3000,
          moq: 2,
          categoryId: childCategoryId,
          tags: ['basket', 'kudai'],
        })
        .expect(201);
      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.pricing).toEqual(
        expect.objectContaining({ basePrice: 2500, mrp: 3000, moq: 2, effectivePrice: 2500 }),
      );
      productId = res.body.id as string;
      productSlug = res.body.slug as string;
      productSku = res.body.sku as string;
    });

    it('rejects duplicate product slugs and SKUs with 409', async () => {
      await http()
        .post('/api/v1/admin/products')
        .set(auth(admin.accessToken))
        .send({ name: { en: 'Impostor Basket' }, slug: productSlug, sku: 'KB-OTHER-X', basePrice: 1 })
        .expect(409);

      await http()
        .post('/api/v1/admin/products')
        .set(auth(admin.accessToken))
        .send({ name: { en: 'Impostor Basket' }, slug: 'kudai-other-x', sku: productSku, basePrice: 1 })
        .expect(409);
    });

    it('keeps DRAFT products hidden from the public catalogue', async () => {
      await http().get(`/api/v1/catalog/products/${productSlug}`).expect(404);
    });

    it('activates the product and exposes it publicly', async () => {
      await http()
        .patch(`/api/v1/admin/products/${productId}`)
        .set(auth(admin.accessToken))
        .send({ status: 'ACTIVE', featured: true })
        .expect(200);

      const detail = await http().get(`/api/v1/catalog/products/${productSlug}`).expect(200);
      expect(detail.body.id).toBe(productId);
      expect(detail.body.status).toBe('ACTIVE');
      expect(detail.body.featured).toBe(true);
      expect(detail.body.category).toEqual(
        expect.objectContaining({ slug: childSlug }),
      );
    });

    it('lists products by category slug and by search text', async () => {
      const byCategory = await http()
        .get(`/api/v1/catalog/products?category=${parentSlug}`)
        .expect(200);
      expect(byCategory.body.items.length).toBeGreaterThan(0);
      expect(byCategory.body.items[0].slug).toBe(productSlug);

      const byQuery = await http()
        .get('/api/v1/catalog/products?q=round%20basket')
        .expect(200);
      expect(byQuery.body.items.length).toBeGreaterThan(0);
    });

    it('creates variants and surfaces a combined price range', async () => {
      const variantSku = `KB-ROUND-${productId.slice(-6)}-NAT-S`;
      const variant = await http()
        .post('/api/v1/admin/variants')
        .set(auth(admin.accessToken))
        .send({
          productId,
          optionValueIds: [colorOptionId, sizeOptionId],
          variantSku,
          priceDelta: 200,
          stockMode: 'AVAILABLE_ONLY',
        })
        .expect(201);
      expect(variant.body.comboHash).toEqual(expect.any(String));
      expect(variant.body.options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: colorOptionId, optionType: 'COLOR' }),
          expect.objectContaining({ id: sizeOptionId, optionType: 'SIZE' }),
        ]),
      );

      const detail = await http().get(`/api/v1/catalog/products/${productSlug}`).expect(200);
      expect(detail.body.pricing.min).toBe(2500);
      expect(detail.body.pricing.max).toBe(2700);
      expect(detail.body.variants).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: variant.body.id })]),
      );

      const variants = await http()
        .get(`/api/v1/catalog/products/${productSlug}/variants`)
        .expect(200);
      expect(Array.isArray(variants.body)).toBe(true);
      expect(variants.body.length).toBe(1);
      expect(variants.body[0].variantSku).toMatch(/-NAT-S$/);
    });

    it('rejects a duplicate variant combo with 409', async () => {
      await http()
        .post('/api/v1/admin/variants')
        .set(auth(admin.accessToken))
        .send({ productId, optionValueIds: [colorOptionId, sizeOptionId] })
        .expect(409);
    });
  });

  describe('pricing governance', () => {
    it('updates list pricing only through the pricing endpoint', async () => {
      const res = await http()
        .patch(`/api/v1/admin/pricing/products/${productId}`)
        .set(auth(admin.accessToken))
        .send({ basePrice: 2300, mrp: 2900, moq: 3 })
        .expect(200);
      expect(res.body).toEqual(
        expect.objectContaining({ id: productId, basePrice: 2300, mrp: 2900, moq: 3 }),
      );

      const detail = await http()
        .get(`/api/v1/admin/products/${productId}`)
        .set(auth(admin.accessToken))
        .expect(200);
      expect(detail.body.pricing.basePrice).toBe(2300);
      expect(detail.body.pricing.max).toBe(2500);
    });
  });

  describe('seo', () => {
    it('reads and updates an entity SEO block', async () => {
      const put = await http()
        .put(`/api/v1/admin/seo/product/${productId}`)
        .set(auth(admin.accessToken))
        .send({ title: 'Kudai Round Basket | Deepa Handmade', metaDescription: 'Handmade round kudai basket', noindex: false })
        .expect(200);
      expect(put.body.seo).toEqual(
        expect.objectContaining({ title: 'Kudai Round Basket | Deepa Handmade' }),
      );

      const get = await http()
        .get(`/api/v1/admin/seo/product/${productId}`)
        .set(auth(admin.accessToken))
        .expect(200);
      expect(get.body.seo.metaDescription).toBe('Handmade round kudai basket');
    });

    it('rejects an invalid SEO entity type', async () => {
      await http()
        .get(`/api/v1/admin/seo/banner/${productId}`)
        .set(auth(admin.accessToken))
        .expect(400);
    });
  });

  describe('soft delete', () => {
    it('archives a product instead of removing it', async () => {
      const res = await http()
        .delete(`/api/v1/admin/products/${productId}`)
        .set(auth(admin.accessToken))
        .expect(200);
      expect(res.body.status).toBe('ARCHIVED');

      await http().get(`/api/v1/catalog/products/${productSlug}`).expect(404);
    });
  });
});