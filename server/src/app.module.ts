import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ItemsModule } from './items/items.module';
import { HnModule } from './hn/hn.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { HealthModule } from './health/health.module';
import { AppExceptionFilter } from './common/app-exception.filter';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ArticlesModule } from './articles/articles.module';
import { JobsModule } from './jobs/jobs.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Important safety: when running tests, prefer `.env.test` over `.env`
      envFilePath:
        process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : ['.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3001),
        MONGO_URI: Joi.string()
          .uri()
          .required()
          .when('NODE_ENV', {
            is: 'test',
            then: Joi.custom((value: unknown, helpers: Joi.CustomHelpers) => {
              if (typeof value !== 'string') {
                return helpers.error('any.invalid');
              }
              try {
                const url = new URL(value);
                const dbName = (url.pathname || '').replace(/^\//, '');
                if (!/test/i.test(dbName)) {
                  return helpers.error('any.invalid');
                }
                return value;
              } catch {
                return helpers.error('any.invalid');
              }
            }, 'test database guard').messages({
              'any.invalid':
                'MONGO_URI must point to a test database when NODE_ENV=test (database name must include "test")',
            }),
          }),
        JWT_SECRET: Joi.string().min(16).required(),
        MAX_ITEMS: Joi.number().integer().min(1).default(100),
        MAX_RESPONSE_BYTES: Joi.number().integer().min(1024).default(262144),
        RATE_LIMIT_TTL_SECONDS: Joi.number().integer().min(1).default(60),
        RATE_LIMIT_LIMIT: Joi.number().integer().min(1).default(10),
        HN_HTTP_TIMEOUT_MS: Joi.number().integer().min(100).default(5000),
        REDIS_URL: Joi.string()
          .uri()
          .required()
          .when('NODE_ENV', {
            is: 'test',
            then: Joi.custom((value: unknown, helpers: Joi.CustomHelpers) => {
              if (typeof value !== 'string') {
                return helpers.error('any.invalid');
              }
              try {
                const url = new URL(value);
                const db = url.pathname
                  ? Number(url.pathname.replace(/^\//, '')) || 0
                  : 0;
                // Require a non-default DB index for tests to prevent wiping dev cache DB via FLUSHDB.
                if (!Number.isInteger(db) || db === 0) {
                  return helpers.error('any.invalid');
                }
                return value;
              } catch {
                return helpers.error('any.invalid');
              }
            }, 'test redis db guard').messages({
              'any.invalid':
                'REDIS_URL must use a non-zero Redis DB when NODE_ENV=test (e.g. redis://localhost:6379/1)',
            }),
          }),
        REDIS_TTL_SECONDS: Joi.number().integer().min(60).default(3900),
      }).unknown(true),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('RATE_LIMIT_TTL_SECONDS') ?? 60) * 1000,
            limit: config.get<number>('RATE_LIMIT_LIMIT') ?? 10,
          },
        ],
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGO_URI'),
      }),
    }),
    ItemsModule,
    HnModule,
    ScheduleModule.forRoot(),
    CacheModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ArticlesModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
