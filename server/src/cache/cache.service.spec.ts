import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: any;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const mockValue = { test: 'data' };
      cacheManager.get.mockResolvedValue(mockValue);

      const result = await service.get('test-key');

      expect(result).toEqual(mockValue);
      expect(cacheManager.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key not found', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('missing-key');

      expect(result).toBeNull();
    });

    it('should return null when cache fails', async () => {
      cacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get('error-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set cache value successfully', async () => {
      const value = { test: 'data' };
      cacheManager.set.mockResolvedValue(undefined);

      const result = await service.set('test-key', value, 60);

      expect(result).toBe(true);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'test-key',
        value,
        60000, // TTL in milliseconds
      );
    });

    it('should return false when set fails', async () => {
      cacheManager.set.mockRejectedValue(new Error('Cache error'));

      const result = await service.set('error-key', 'value');

      expect(result).toBe(false);
    });
  });

  describe('del', () => {
    it('should delete cache key successfully', async () => {
      cacheManager.del.mockResolvedValue(undefined);

      const result = await service.del('test-key');

      expect(result).toBe(true);
      expect(cacheManager.del).toHaveBeenCalledWith('test-key');
    });

    it('should return false when delete fails', async () => {
      cacheManager.del.mockRejectedValue(new Error('Cache error'));

      const result = await service.del('error-key');

      expect(result).toBe(false);
    });
  });
});
