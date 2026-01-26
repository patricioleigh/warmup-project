import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { requestIdMiddleware } from '../src/common/request-id.middleware';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/(.*)'],
  });
  app.use(requestIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
  return app;
}

type RedisClientLike = {
  flushDb?: () => Promise<unknown>;
  flushdb?: () => Promise<unknown>;
  sendCommand?: (args: string[]) => Promise<unknown>;
};

export async function flushRedis(): Promise<void> {
  const client = (global as any).__redisClient as RedisClientLike | undefined;
  if (!client) return;

  if (typeof client.flushDb === 'function') {
    await client.flushDb();
    return;
  }
  if (typeof client.flushdb === 'function') {
    await client.flushdb();
    return;
  }
  if (typeof client.sendCommand === 'function') {
    await client.sendCommand(['FLUSHDB']);
  }
}
