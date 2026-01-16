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
import { InteractionsModule } from './interactions/interactions.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(3001),
        MONGO_URI: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        MAX_ITEMS: Joi.number().integer().min(1).default(100),
        MAX_RESPONSE_BYTES: Joi.number().integer().min(1024).default(262144),
        RATE_LIMIT_TTL_SECONDS: Joi.number().integer().min(1).default(8000),
        RATE_LIMIT_LIMIT: Joi.number().integer().min(1).default(10),
        HN_HTTP_TIMEOUT_MS: Joi.number().integer().min(100).default(5000),
      }).unknown(true),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL_SECONDS') ?? 8000,
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
    HealthModule,
    UsersModule,
    AuthModule,
    ArticlesModule,
    InteractionsModule,
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
