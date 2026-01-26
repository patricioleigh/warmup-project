import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp, flushRedis } from './test-app';

describe('Protected routes (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await flushRedis();
  });

  it('GET /api/v1/articles rejects without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/articles').expect(401);
  });
});
