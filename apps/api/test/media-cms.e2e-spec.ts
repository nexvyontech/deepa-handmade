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

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082',
  'hex',
);

describe('Media & CMS (e2e)', () => {
  let app: INestApplication;
  let sequence = 0;

  const uniqueMobile = (): string =>
    `8${String(Date.now() % 1_000_000).padStart(6, '0')}${String(sequence++).padStart(4, '0')}`;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  let admin: AuthResponseBody;
  let customer: AuthResponseBody;

  const ownerId = () => new Date().getTime().toString(16).padStart(12, '0').repeat(2).slice(0, 24);

  let productId: string;
  let mediaOneId: string;
  let mediaTwoId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();

    const roles = app.get(getModelToken('Role'));
    const users = app.get(getModelToken('User'));

    const superAdmin = await roles.findOneAndUpdate(
      { code: ROLES.SUPER_ADMIN },
      { $setOnInsert: { name: 'Super Admin', permissions: [], isSystem: true } },
      { upsert: true, new: true },
    );
    await roles.updateOne(
      { _id: superAdmin._id },
      { $set: { permissions: [...ALL_PERMISSIONS] } },
    );

    const adminMobile = uniqueMobile();
    const adminPassword = 'AdminPass1';
    await users.create({
      profileType: 'STAFF',
      name: 'Media E2E Admin',
      mobile: adminMobile,
      passwordHash: await argon2.hash(adminPassword, {
        type: argon2.argon2id,
        memoryCost: 4096,
        timeCost: 2,
        parallelism: 1,
      }),
      roleId: superAdmin._id,
      status: 'ACTIVE',
    });

    const adminLogin = await http()
      .post('/api/v1/auth/login')
      .send({ mobile: adminMobile, password: adminPassword })
      .expect(200);
    admin = adminLogin.body as AuthResponseBody;

    const customerMobile = uniqueMobile();
    const registration = await http()
      .post('/api/v1/auth/register')
      .send({ name: 'Media E2E Customer', mobile: customerMobile, password: 'Passw0rd!' })
      .expect(201);
    customer = registration.body as AuthResponseBody;

    const product = await http()
      .post('/api/v1/admin/products')
      .set(auth(admin.accessToken))
      .send({
        name: { en: `Media Test Basket ${sequence}` },
        slug: `media-test-basket-${Date.now().toString(36)}${sequence}`,
        sku: `MEDIA-PKU-${Date.now().toString(36).toUpperCase()}${sequence}`,
        basePrice: 100,
      })
      .expect(201);
    productId = product.body.id as string;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('media upload and ordering', () => {
    it('uploads a PNG for the product owner', async () => {
      const res = await http()
        .post('/api/v1/media/upload')
        .set(auth(admin.accessToken))
        .field('ownerType', 'PRODUCT')
        .field('ownerId', productId)
        .field('bucket', 'PUBLIC')
        .attach('file', PNG, { filename: 'primary.png', contentType: 'image/png' })
        .expect(201);
      expect(res.body.ownerId).toBe(productId);
      expect(res.body.status).toBe('AVAILABLE');
      mediaOneId = res.body.id as string;
    });

    it('uploads a second image and orders the set', async () => {
      const second = await http()
        .post('/api/v1/media/upload')
        .set(auth(admin.accessToken))
        .field('ownerType', 'PRODUCT')
        .field('ownerId', productId)
        .field('bucket', 'PUBLIC')
        .attach('file', PNG, { filename: 'secondary.png', contentType: 'image/png' })
        .expect(201);
      mediaTwoId = second.body.id as string;

      const ordered = await http()
        .put(`/api/v1/admin/products/${productId}/media`)
        .set(auth(admin.accessToken))
        .send({ mediaIds: [mediaTwoId, mediaOneId] })
        .expect(200);
      expect(ordered.body.map((view: { id: string }) => view.id)).toEqual([mediaTwoId, mediaOneId]);
    });

    it('refuses a reorder that is missing an owned image', async () => {
      await http()
        .put(`/api/v1/admin/products/${productId}/media`)
        .set(auth(admin.accessToken))
        .send({ mediaIds: [mediaTwoId] })
        .expect(409);
    });

    it('lists product media with admin read and denies customers', async () => {
      const list = await http()
        .get(`/api/v1/admin/products/${productId}/media`)
        .set(auth(admin.accessToken))
        .expect(200);
      expect(Array.isArray(list.body)).toBe(true);
      expect(list.body.length).toBe(2);

      await http()
        .get(`/api/v1/admin/products/${productId}/media`)
        .set(auth(customer.accessToken))
        .expect(403);
    });

    it('streams public media content without authentication', async () => {
      const res = await http().get(`/api/v1/media/${mediaOneId}/content`).expect(200);
      expect(res.headers['content-type']).toContain('image/png');
    });

    it('detaches media by hiding it from the product', async () => {
      await http()
        .delete(`/api/v1/admin/products/${productId}/media/${mediaOneId}`)
        .set(auth(admin.accessToken))
        .expect(200);

      const owned = await http()
        .get(`/api/v1/admin/products/${productId}/media`)
        .set(auth(admin.accessToken))
        .expect(200);
      const active = owned.body.filter((view: { status: string }) => view.status !== 'HIDDEN');
      expect(active.map((view: { id: string }) => view.id)).not.toContain(mediaOneId);
    });
  });

  describe('cms pages', () => {
    let pageId: string;
    let pageSlug: string;

    it('creates a DRAFT page and keeps it out of the public list', async () => {
      pageSlug = `about-us-${Date.now().toString(36)}${sequence}`;
      const res = await http()
        .post('/api/v1/admin/cms/pages')
        .set(auth(admin.accessToken))
        .send({
          slug: pageSlug,
          type: 'PAGE',
          title: { en: 'About Us', ta: 'எங்களை பற்றி' },
          content: { en: 'Deepa Handmade story.' },
          sortOrder: 1,
        })
        .expect(201);
      expect(res.body.status).toBe('DRAFT');
      pageId = res.body.id as string;

      await http().get(`/api/v1/cms/pages/${pageSlug}`).expect(404);
      const publicList = await http().get('/api/v1/cms/pages').expect(200);
      expect(publicList.body.some((page: { slug: string }) => page.slug === pageSlug)).toBe(false);
    });

    it('publishes the page and serves it publicly', async () => {
      await http()
        .patch(`/api/v1/admin/cms/pages/${pageId}/status`)
        .set(auth(admin.accessToken))
        .send({ action: 'publish' })
        .expect(200);

      const page = await http().get(`/api/v1/cms/pages/${pageSlug}`).expect(200);
      expect(page.body.status).toBe('PUBLISHED');
      expect(page.body.publishedAt).toEqual(expect.any(String));

      const publicList = await http().get('/api/v1/cms/pages').expect(200);
      expect(publicList.body.some((entry: { slug: string }) => entry.slug === pageSlug)).toBe(true);
    });

    it('rejects a customer publishing a page', async () => {
      await http()
        .patch(`/api/v1/admin/cms/pages/${pageId}/status`)
        .set(auth(customer.accessToken))
        .send({ action: 'archive' })
        .expect(403);
    });
  });

  describe('cms banners', () => {
    let bannerId: string;

    it('creates a banner from an uploaded image', async () => {
      const media = await http()
        .post('/api/v1/media/upload')
        .set(auth(admin.accessToken))
        .field('ownerType', 'BANNER')
        .field('ownerId', ownerId())
        .field('bucket', 'PUBLIC')
        .attach('file', PNG, { filename: 'hero-banner.png', contentType: 'image/png' })
        .expect(201);

      const res = await http()
        .post('/api/v1/admin/banners')
        .set(auth(admin.accessToken))
        .send({
          title: { en: 'Festive Sale' },
          imageMediaId: media.body.id,
          ctaUrl: '/catalog/products?q=sale',
          target: 'PAGE',
          location: 'HOME_HERO',
          sortOrder: 1,
        })
        .expect(201);
      expect(res.body.image).toEqual(expect.objectContaining({ id: media.body.id }));
      expect(res.body.active).toBe(true);
      bannerId = res.body.id as string;
    });

    it('serves active banners on the public endpoint', async () => {
      const res = await http().get('/api/v1/cms/banners').expect(200);
      expect(res.body.some((banner: { id: string }) => banner.id === bannerId)).toBe(true);
    });

    it('deactivates a banner instead of hard deleting it', async () => {
      await http()
        .delete(`/api/v1/admin/banners/${bannerId}`)
        .set(auth(admin.accessToken))
        .expect(200);

      const res = await http().get('/api/v1/cms/banners').expect(200);
      expect(res.body.some((banner: { id: string }) => banner.id === bannerId)).toBe(false);
    });
  });
});