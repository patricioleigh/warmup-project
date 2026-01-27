import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { CacheService } from '../cache/cache.service';

describe('HealthService', () => {
  let service: HealthService;
  let connection: any;
  let cacheService: any;

  beforeEach(async () => {
    const mockConnection = {
      readyState: 1, // 1 = connected
    };

    const mockCacheService = {
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    connection = module.get(getConnectionToken());
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isMongoReady', () => {
    it('should return true when MongoDB is connected', () => {
      connection.readyState = 1;
      expect(service.isMongoReady()).toBe(true);
    });

    it('should return false when MongoDB is not connected', () => {
      connection.readyState = 0;
      expect(service.isMongoReady()).toBe(false);
    });

    it('should return false when MongoDB is disconnected', () => {
      connection.readyState = 2;
      expect(service.isMongoReady()).toBe(false);
    });
  });

  describe('isRedisReady', () => {
    it('should return true when Redis ping succeeds', async () => {
      cacheService.ping.mockResolvedValue(true);
      const result = await service.isRedisReady();
      expect(result).toBe(true);
    });

    it('should return false when Redis ping fails', async () => {
      cacheService.ping.mockResolvedValue(false);
      const result = await service.isRedisReady();
      expect(result).toBe(false);
    });
  });
});
