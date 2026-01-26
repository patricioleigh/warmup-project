import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const logger = new Logger('CacheModule');
        const redisUrl = config.getOrThrow<string>('REDIS_URL');
        const url = new URL(redisUrl);

        const store = await redisStore({
          socket: {
            host: url.hostname,
            port: Number(url.port || 6379),
          },
          username: url.username || undefined,
          password: url.password || undefined,
          database: url.pathname ? Number(url.pathname.replace('/', '')) || 0 : 0,
        });

        const ttlSeconds = config.get<number>('REDIS_TTL_SECONDS', 3900);
        const ttl = ttlSeconds * 1000; // cache-manager v6 expects milliseconds
        logger.log({ msg: 'cache store configured', store: 'redis', ttlSeconds, ttlMs: ttl });

        //  Store both the redis client and the store globally for CacheService to access
        // This is a workaround for cache-manager v6's complex nested structure
        (global as any).__redisClient = store.client;
        (global as any).__redisStore = store;

        // Test if store is working
        try {
          await store.set('__test_key', 'test_value', ttl);
          const testVal = await store.get('__test_key');
          logger.log({ msg: 'store test', success: testVal === 'test_value' });
        } catch (err: any) {
          logger.error({ msg: 'store test failed', error: err?.message });
        }

        return { store, ttl };
      },
      isGlobal: true,
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
