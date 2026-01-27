import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { createTestApp, flushRedis } from './test-app';
import { CacheService } from '../src/cache/cache.service';

type SupertestServer = Parameters<typeof request>[0];

async function registerAndLogin(
  app: INestApplication,
  email: string,
  password: string,
) {
  const server = app.getHttpServer() as unknown as SupertestServer;
  await request(server)
    .post('/api/v1/auth/register')
    .send({ email, password })
    .expect(201);
  const res = await request(server)
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return res.body.accessToken as string;
}

describe('Articles cache (e2e)', () => {
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

  it('GET /api/v1/articles caches the global list', async () => {
    const token = await registerAndLogin(
      app,
      `u_${Date.now()}@ex.com`,
      'StrongPassw0rd!',
    );

    await conn.collection('items').insertOne({
      objectId: 'cache-1',
      title: 'Cached item',
      url: 'https://example.com/cache-1',
      author: 'alice',
      createdAt: new Date(),
      isDeleted: false,
    });

    const server = app.getHttpServer() as unknown as SupertestServer;
    const first = await request(server)
      .get('/api/v1/articles?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(first.body.items.length).toBe(1);

    const cacheKey = 'global_items_list:1:20';
    const cached = await cacheService.get(cacheKey);
    expect(cached).toBeTruthy();

    await conn.collection('items').deleteMany({});

    const second = await request(server)
      .get('/api/v1/articles?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(second.body.items.length).toBe(1);
    expect(second.body.items[0].objectId).toBe('cache-1');
  });
});
