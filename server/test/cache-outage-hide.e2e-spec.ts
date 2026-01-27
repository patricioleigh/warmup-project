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

describe('Cache outage fallback (hide)', () => {
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

  it('DELETE /api/v1/articles/:objectId works when cache is unavailable', async () => {
    const email = `u_${Date.now()}@ex.com`;
    const token = await registerAndLogin(app, email, 'StrongPassw0rd!');

    (cacheService as any).cacheAvailable = false;
    (cacheService as any).lastFailureAt = Date.now();

    await conn.collection('items').insertOne({
      objectId: 'outage-2',
      title: 'Outage item 2',
      url: 'https://example.com/outage-2',
      author: 'alice',
      createdAt: new Date(),
      isDeleted: false,
    });

    const server = app.getHttpServer() as unknown as SupertestServer;
    await request(server)
      .delete('/api/v1/articles/outage-2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const user = await conn.collection('users').findOne({ email });
    const interaction = await conn
      .collection('userarticleinteractions')
      .findOne({
        userId: user?._id?.toString(),
        objectId: 'outage-2',
      });
    expect(interaction).toBeTruthy();
  });
});
