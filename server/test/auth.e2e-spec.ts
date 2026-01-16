import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/register + POST /api/v1/auth/login returns access token', async () => {
    const email = `user_${Date.now()}@example.com`;
    const password = 'StrongPassw0rd!';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(typeof loginRes.body?.accessToken).toBe('string');
    expect(loginRes.body.accessToken.length).toBeGreaterThan(10);
  });
});

