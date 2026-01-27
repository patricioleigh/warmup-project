import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { createTestApp, flushRedis } from './test-app';

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

describe('Articles (e2e)', () => {
  let app: INestApplication;
  let conn: Connection;

  beforeAll(async () => {
    app = await createTestApp();
    conn = app.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await flushRedis();
    // Clean collections used by these tests
    await conn.collection('users').deleteMany({});
    await conn.collection('items').deleteMany({});
    await conn.collection('userarticleinteractions').deleteMany({});
  });

  it('GET /api/v1/articles returns paginated newest-first for authenticated user', async () => {
    const token = await registerAndLogin(
      app,
      `u_${Date.now()}@ex.com`,
      'StrongPassw0rd!',
    );

    const older = new Date(Date.now() - 60_000);
    const newer = new Date(Date.now() - 1_000);

    await conn.collection('items').insertMany([
      {
        objectId: 'a1',
        title: 'Older',
        url: 'https://example.com/1',
        author: 'alice',
        createdAt: older,
        isDeleted: false,
      },
      {
        objectId: 'a2',
        title: 'Newer',
        url: 'https://example.com/2',
        author: 'bob',
        createdAt: newer,
        isDeleted: false,
      },
    ]);

    const server = app.getHttpServer() as unknown as SupertestServer;
    const res = await request(server)
      .get('/api/v1/articles?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(2);
    expect(res.body.items[0].objectId).toBe('a2');
    expect(res.body.items[1].objectId).toBe('a1');
  });

  it('DELETE /api/v1/articles/:objectId hides for that user only', async () => {
    const password = 'StrongPassw0rd!';
    const token1 = await registerAndLogin(
      app,
      `u1_${Date.now()}@ex.com`,
      password,
    );
    const token2 = await registerAndLogin(
      app,
      `u2_${Date.now()}@ex.com`,
      password,
    );

    await conn.collection('items').insertOne({
      objectId: 'x1',
      title: 'Title',
      url: 'https://example.com/x1',
      author: 'alice',
      createdAt: new Date(),
      isDeleted: false,
    });

    const server = app.getHttpServer() as unknown as SupertestServer;
    await request(server)
      .delete('/api/v1/articles/x1')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    const list1 = await request(server)
      .get('/api/v1/articles')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);
    expect(
      list1.body.items.find((i: any) => i.objectId === 'x1'),
    ).toBeUndefined();

    const list2 = await request(server)
      .get('/api/v1/articles')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);
    expect(
      list2.body.items.find((i: any) => i.objectId === 'x1'),
    ).toBeDefined();
  });

  it('GET /api/v1/articles rejects limit > MAX_ITEMS with stable code', async () => {
    const token = await registerAndLogin(
      app,
      `u_${Date.now()}@ex.com`,
      'StrongPassw0rd!',
    );

    const server = app.getHttpServer() as unknown as SupertestServer;
    const res = await request(server)
      .get('/api/v1/articles?limit=100000')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(res.body.code).toBe('PAGINATION_LIMIT_EXCEEDED');
  });
});
