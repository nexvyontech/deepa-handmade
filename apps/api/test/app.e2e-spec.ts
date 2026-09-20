import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createTestApp();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/info (GET) returns API metadata', () => {
    return request(app.getHttpServer())
      .get('/api/v1/info')
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe('deepa-handmade-api');
        expect(res.body.version).toBe('1');
        expect(res.body.environment).toBeTruthy();
      });
  });

  it('/api/v1/health (GET) reports application and database status', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.info.app.status).toBe('up');
        expect(res.body.info.database.status).toBe('up');
        const database = res.body.info.database;
        const isConfigured = database.mode !== 'not_configured';
        expect(database.state === 'connected' || !isConfigured).toBe(true);
        expect(res.body.details.memory_heap).toBeDefined();
        expect(res.body.details.storage).toBeDefined();
      });
  });

  it('echoes and generates a request correlation id header', () => {
    return request(app.getHttpServer())
      .get('/api/v1/info')
      .set('x-request-id', 'correlation-abc')
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-request-id']).toBe('correlation-abc');
      });
  });

  it('returns a standard error body with request id for unknown routes', () => {
    return request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .set('x-request-id', 'err-xyz')
      .expect(404)
      .expect((res) => {
        expect(res.body.statusCode).toBe(404);
        expect(res.body.code).toBe('NOT_FOUND');
        expect(res.body.requestId).toBe('err-xyz');
        expect(res.body.message).toBeTruthy();
        expect(res.body.timestamp).toBeTruthy();
        expect(res.body.stack).toBeUndefined();
      });
  });
});