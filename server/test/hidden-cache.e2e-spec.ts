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

describe('Hidden items cache (e2e)', () => {
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

  it('hiding an item writes through to the user hidden set cache', async () => {
    const email = `u_${Date.now()}@ex.com`;
    const token = await registerAndLogin(app, email, 'StrongPassw0rd!');

    await conn.collection('items').insertOne({
      objectId: 'hide-1',
      title: 'Hidden item',
      url: 'https://example.com/hide-1',
      author: 'alice',
      createdAt: new Date(),
      isDeleted: false,
    });

    await request(app.getHttpServer())
      .delete('/api/v1/articles/hide-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const user = await conn.collection('users').findOne({ email });
    expect(user).toBeTruthy();

    const key = `user:${user?._id?.toString()}:hidden`;
    const members = await cacheService.smembers(key);
    expect(members).toContain('hide-1');
  });
});
