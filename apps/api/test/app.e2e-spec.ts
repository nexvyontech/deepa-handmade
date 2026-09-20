import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
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
      });
  });

  it('/api/v1/health (GET) reports ok when database is not configured', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.info.database.mode).toBe('not_configured');
      });
  });
});