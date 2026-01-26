import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

type CacheOp<T> = () => Promise<T>;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cacheAvailable = true;
  private retryAfterMs = 10_000;
  private lastFailureAt?: number;

  private readonly globalListKeysKey = 'global_items_list:keys';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    const result = await this.safeExec(() => {
      const store = (global as any).__redisStore;
      if (store) {
        return store.get(key) as Promise<T | undefined>;
      }
      return this.cacheManager.get<T>(key) as Promise<T | undefined>;
    });
    return result === undefined ? null : (result as T);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    // TTL is already in milliseconds at module level,
    // but method-level overrides need conversion
    const ttl = typeof ttlSeconds === 'number' ? ttlSeconds * 1000 : undefined;
    const result = await this.safeExec(() => {
      const store = (global as any).__redisStore;
      if (store) {
        return store.set(key, value, ttl);
      }
      return this.cacheManager.set(key, value, ttl);
    });
    return result !== null;
  }

  async del(key: string): Promise<boolean> {
    const result = await this.safeExec(() => {
      const store = (global as any).__redisStore;
      if (store) {
        return store.del(key);
      }
      return this.cacheManager.del(key);
    });
    return result !== null;
  }

  async ping(): Promise<boolean> {
    const client = this.getRedisClient();
    if (!client?.ping) {
      return false;
    }
    try {
      const res = await client.ping();
      return typeof res === 'string'
        ? res.toLowerCase() === 'pong'
        : Boolean(res);
    } catch (err) {
      this.markUnavailable(err);
      return false;
    }
  }

  async sadd(key: string, value: string): Promise<boolean> {
    return this.safeExec(async () => {
      const client = this.getRedisClient();
      const sadd = client?.sAdd ?? client?.sadd;
      if (typeof sadd !== 'function') {
        this.logger.debug({
          msg: 'sadd: Redis client methods not available, skipping set tracking',
        });
        return true; // Don't fail, just skip tracking
      }
      await sadd.call(client, key, value);
      return true;
    }).then((res) => res !== null);
  }

  async smembers(key: string): Promise<string[] | null> {
    return this.safeExec(async () => {
      const client = this.getRedisClient();
      const smembers = client?.sMembers ?? client?.smembers;
      if (typeof smembers !== 'function') {
        this.logger.debug({
          msg: 'smembers: Redis client methods not available',
        });
        return [];
      }
      const result = await smembers.call(client, key);
      return Array.isArray(result) ? result.map(String) : [];
    });
  }

  async srem(key: string, value: string): Promise<boolean> {
    return this.safeExec(async () => {
      const client = this.getRedisClient();
      const srem = client?.sRem ?? client?.srem;
      if (typeof srem !== 'function') {
        this.logger.debug({ msg: 'srem: Redis client methods not available' });
        return true;
      }
      await srem.call(client, key, value);
      return true;
    }).then((res) => res !== null);
  }

  async exists(key: string): Promise<boolean | null> {
    return this.safeExec(async () => {
      const client = this.getRedisClient();
      if (!client?.exists) {
        this.logger.debug({
          msg: 'exists: Redis client methods not available',
        });
        return false;
      }
      const count = await client.exists(key);
      return count > 0;
    });
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    return this.safeExec(async () => {
      const client = this.getRedisClient();
      if (!client?.expire) {
        this.logger.debug({
          msg: 'expire: Redis client methods not available, skipping TTL update',
        });
        return true; // Don't fail, TTL is already set on the key itself
      }
      await client.expire(key, ttlSeconds);
      return true;
    }).then((res) => res !== null);
  }

  getGlobalListKey(page: number, limit: number): string {
    return `global_items_list:${page}:${limit}`;
  }

  async getGlobalList<T>(page: number, limit: number): Promise<T | null> {
    const key = this.getGlobalListKey(page, limit);
    const cached = await this.get<T>(key);
    this.logger.debug({
      msg: 'cache get global list',
      key,
      hit: cached !== null,
    });
    return cached;
  }

  async setGlobalList<T>(
    page: number,
    limit: number,
    value: T,
    ttlSeconds: number,
  ): Promise<boolean> {
    const key = this.getGlobalListKey(page, limit);
    const stored = await this.set(key, value, ttlSeconds);
    if (stored) {
      await this.sadd(this.globalListKeysKey, key);
      await this.expire(this.globalListKeysKey, ttlSeconds);
    }
    this.logger.debug({
      msg: 'cache set global list',
      key,
      stored,
    });
    return stored;
  }

  async invalidateGlobalList(): Promise<void> {
    const keys = await this.smembers(this.globalListKeysKey);
    if (!keys || keys.length === 0) {
      this.logger.debug({ msg: 'cache invalidate global list: no keys' });
      return;
    }
    this.logger.debug({
      msg: 'cache invalidate global list',
      count: keys.length,
    });
    await Promise.all(keys.map((key) => this.del(key)));
    await this.del(this.globalListKeysKey);
  }

  getUserHiddenKey(userId: string): string {
    return `user:${userId}:hidden`;
  }

  private async safeExec<T>(op: CacheOp<T>): Promise<T | null> {
    if (!this.cacheAvailable && !this.isReadyToRetry()) {
      return null;
    }
    try {
      const result = await op();
      this.cacheAvailable = true;
      return result;
    } catch (err: any) {
      this.markUnavailable(err);
      return null;
    }
  }

  private isReadyToRetry() {
    if (!this.lastFailureAt) return true;
    return Date.now() - this.lastFailureAt > this.retryAfterMs;
  }

  private markUnavailable(err: any) {
    this.cacheAvailable = false;
    this.lastFailureAt = Date.now();
    this.logger.warn({
      msg: 'cache unavailable; falling back to primary store',
      error: err?.message ?? err,
    });
  }

  /**
   * Navigates the nested structure to find the Redis client.
   *
   * Due to cache-manager v6's complex Keyv wrapper structure, we first try
   * the global client that was stored during module initialization.
   */
  private getRedisClient(): any {
    // Try global client first (set during module initialization)
    const globalClient = (global as any).__redisClient;
    if (globalClient) {
      return globalClient;
    }

    const cache = this.cacheManager as any;

    // Try direct store access (cache-manager v5)
    if (cache?.store?.client) {
      return cache.store.client;
    }

    // cache-manager v6 multi-store structure
    const stores = Array.isArray(cache?.stores) ? cache.stores : [];
    const keyv = stores[0];

    if (!keyv) {
      this.logger.debug({ msg: 'No stores found in cache manager' });
      return null;
    }

    // Try various access paths in Keyv structure
    const attempts = [
      { path: 'keyv.opts.store', value: keyv.opts?.store },
      { path: 'keyv._store', value: keyv._store },
      { path: 'keyv.store', value: keyv.store },
      { path: 'keyv', value: keyv },
    ];

    for (const attempt of attempts) {
      if (attempt.value?.client) {
        return attempt.value.client;
      }
      if (attempt.value?.getClient) {
        return attempt.value.getClient();
      }
    }

    this.logger.debug({
      msg: 'Unable to access Redis client',
      hasGlobalClient: !!globalClient,
      keyvKeys: keyv
        ? Object.keys(keyv)
            .filter((k) => !k.startsWith('_'))
            .slice(0, 10)
        : [],
      optsKeys: keyv.opts ? Object.keys(keyv.opts) : [],
      optsStoreKeys: keyv.opts?.store ? Object.keys(keyv.opts.store) : [],
    });

    return null;
  }
}
