import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { createTestApp, flushRedis } from './test-app';
import { CacheService } from '../src/cache/cache.service';

async function registerAndLogin(
  app: INestApplication,
  email: string,
  password: string,
) {
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password })
    .expect(201);
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return res.body.accessToken as string;
}

describe('Cache outage fallback (list)', () => {
  let app: INestApplication;
  let conn: Connection;
  let cacheService: CacheService;

  beforeAll(async () => {
    app = await createTestApp();
    conn = app.get<Connection>(getConnectionToken());
    cacheService = app.get(CacheService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await flushRedis();
    await conn.collection('users').deleteMany({});
    await conn.collection('items').deleteMany({});
    await conn.collection('userarticleinteractions').deleteMany({});
  });

  it('GET /api/v1/articles works when cache is unavailable', async () => {
    const token = await registerAndLogin(
      app,
      `u_${Date.now()}@ex.com`,
      'StrongPassw0rd!',
    );

    (cacheService as any).cacheAvailable = false;
    (cacheService as any).lastFailureAt = Date.now();

    await conn.collection('items').insertOne({
      objectId: 'outage-1',
      title: 'Outage item',
      url: 'https://example.com/outage-1',
      author: 'alice',
      createdAt: new Date(),
      isDeleted: false,
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/articles?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      res.body.items.find((i: any) => i.objectId === 'outage-1'),
    ).toBeDefined();
  });
});
