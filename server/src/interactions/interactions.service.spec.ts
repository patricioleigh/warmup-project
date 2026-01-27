import { Test, TestingModule } from '@nestjs/testing';
import { InteractionsService } from './interactions.service';
import { getModelToken } from '@nestjs/mongoose';
import { UserArticleInteraction } from './schemas/user-article-interaction.schema';
import { CacheService } from '../cache/cache.service';

describe('InteractionsService', () => {
  let service: InteractionsService;
  let interactionsModel: any;
  let cacheService: any;

  beforeEach(async () => {
    const mockInteractionsModel = {
      findOneAndUpdate: jest.fn(),
      find: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn(),
    };

    const mockCacheService = {
      sadd: jest.fn().mockResolvedValue(true),
      srem: jest.fn().mockResolvedValue(true),
      smembers: jest.fn(),
      exists: jest.fn(),
      getUserHiddenKey: jest.fn((userId: string) => `user:${userId}:hidden`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionsService,
        {
          provide: getModelToken(UserArticleInteraction.name),
          useValue: mockInteractionsModel,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<InteractionsService>(InteractionsService);
    interactionsModel = module.get(
      getModelToken(UserArticleInteraction.name),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hideArticle', () => {
    it('should hide an article and update cache', async () => {
      const params = { userId: 'user1', objectId: 'article1' };

      interactionsModel.findOneAndUpdate.mockResolvedValue({
        userId: params.userId,
        objectId: params.objectId,
        isHidden: true,
      });

      const result = await service.hideArticle(params);

      expect(result).toEqual({
        objectId: params.objectId,
        isHidden: true,
      });
      expect(interactionsModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: params.userId, objectId: params.objectId },
        { $set: { isHidden: true } },
        { upsert: true, new: true },
      );
      expect(cacheService.sadd).toHaveBeenCalled();
    });
  });

  describe('getHiddenObjectIdsForUser', () => {
    it('should return cached hidden IDs if available', async () => {
      const userId = 'user1';
      const cachedIds = ['article1', 'article2'];

      cacheService.smembers.mockResolvedValue(cachedIds);
      cacheService.exists.mockResolvedValue(true);

      const result = await service.getHiddenObjectIdsForUser(userId);

      expect(result).toEqual(cachedIds);
      expect(cacheService.smembers).toHaveBeenCalled();
    });

    it('should fetch from database on cache miss', async () => {
      const userId = 'user1';
      const dbResults = [{ objectId: 'article1' }, { objectId: 'article2' }];

      cacheService.smembers.mockResolvedValue(null);
      interactionsModel.lean.mockResolvedValue(dbResults);

      const result = await service.getHiddenObjectIdsForUser(userId);

      expect(result).toEqual(['article1', 'article2']);
      expect(interactionsModel.find).toHaveBeenCalledWith({
        userId,
        isHidden: true,
      });
    });

    it('should handle empty hidden list', async () => {
      const userId = 'user1';

      cacheService.smembers.mockResolvedValue(null);
      interactionsModel.lean.mockResolvedValue([]);

      const result = await service.getHiddenObjectIdsForUser(userId);

      expect(result).toEqual([]);
      expect(cacheService.sadd).toHaveBeenCalledWith(
        expect.any(String),
        '__none__',
      );
    });
  });
});
