import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';
import { ErrorCode } from '../common/error-codes';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  overall() {
    const mongoReady = this.health.isMongoReady();
    return {
      status: mongoReady ? 'ok' : 'degraded',
      checks: {
        mongo: mongoReady ? 'ok' : 'not_ready',
      },
    };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    const mongoReady = this.health.isMongoReady();
    if (!mongoReady) {
      throw new ServiceUnavailableException({
        code: ErrorCode.DEPENDENCY_TIMEOUT,
        message: 'MongoDB not ready',
      });
    }
    return {
      status: 'ok',
      checks: {
        mongo: 'ok',
      },
    };
  }
}

