import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { ErrorCode } from '../common/error-codes';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async overall() {
    const mongoReady = this.health.isMongoReady();
    const redisReady = await this.health.isRedisReady();
    return {
      status: mongoReady && redisReady ? 'ok' : 'degraded',
      checks: {
        mongo: mongoReady ? 'ok' : 'not_ready',
        redis: redisReady ? 'ok' : 'not_ready',
      },
    };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    const mongoReady = this.health.isMongoReady();
    const redisReady = await this.health.isRedisReady();
    if (!mongoReady || !redisReady) {
      throw new ServiceUnavailableException({
        code: ErrorCode.DEPENDENCY_TIMEOUT,
        message: !mongoReady ? 'MongoDB not ready' : 'Redis not ready',
      });
    }
    return {
      status: 'ok',
      checks: {
        mongo: 'ok',
        redis: 'ok',
      },
    };
  }
}
