import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { createTestApp } from './test-app';
import { CacheService } from '../src/cache/cache.service';
import { ItemsService } from '../src/items/items.service';
import { HnService } from '../src/hn/hn.service';

async function registerAndLogin(app: INestApplication, email: string, password: string) {
  await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email, password }).expect(201);
  const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password }).expect(200);
  return res.body.accessToken as string;
}

describe('Hourly sync cache invalidation (e2e)', () => {
  let app: INestApplication;
  let conn: Connection;
  let cacheService: CacheService;
  let itemsService: ItemsService;
  let hnService: HnService;

  beforeAll(async () => {
    app = await createTestApp();
    conn = app.get<Connection>(getConnectionToken());
    cacheService = app.get(CacheService);
    itemsService = app.get(ItemsService);
    hnService = app.get(HnService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await conn.collection('users').deleteMany({});
    await conn.collection('items').deleteMany({});
    await conn.collection('userarticleinteractions').deleteMany({});
    await conn.collection('jobstates').deleteMany({});
  });

  it('hourlySync invalidates the cached list after sync completes', async () => {
    const token = await registerAndLogin(app, `u_${Date.now()}@ex.com`, 'StrongPassw0rd!');

    await conn.collection('items').insertOne({
      objectId: 'sync-1',
      title: 'Sync item',
      url: 'https://example.com/sync-1',
      author: 'alice',
      createdAt: new Date(),
      isDeleted: false,
    });

    await request(app.getHttpServer())
      .get('/api/v1/articles?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const cacheKey = 'global_items_list:1:20';
    const cached = await cacheService.get(cacheKey);
    expect(cached).toBeTruthy();

    jest.spyOn(hnService, 'fetchLatestClean').mockResolvedValue({
      query: 'nodejs',
      page: 0,
      hitPerPage: 20,
      fetched: 0,
      kept: 0,
      hits: [],
    });

    await itemsService.hourlySync();

    const after = await cacheService.get(cacheKey);
    expect(after).toBeNull();
  });
});
