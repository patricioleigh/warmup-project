import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly cacheService: CacheService,
  ) {}

  isMongoReady(): boolean {
    // 1 = connected
    return this.connection?.readyState === 1;
  }

  async isRedisReady(): Promise<boolean> {
    return this.cacheService.ping();
  }
}

