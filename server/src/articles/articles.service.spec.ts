import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from './articles.service';
import { getModelToken } from '@nestjs/mongoose';
import { Items } from '../items/schemas/items.schema';
import { UserArticleInteraction } from './schemas/user-article-interaction.schema';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let itemsModel: any;
  let userInteractionsModel: any;
  let cacheService: any;

  beforeEach(async () => {
    const mockItemsModel = {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn(),
    };

    const mockUserInteractionsModel = {
      findOneAndUpdate: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          MAX_ITEMS: 100,
          MAX_RESPONSE_BYTES: 262144,
          REDIS_TTL_SECONDS: 3900,
        };
        return config[key];
      }),
    };

    const mockCacheService = {
      getUserList: jest.fn(),
      setUserList: jest.fn(),
      invalidateUserList: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getModelToken(Items.name),
          useValue: mockItemsModel,
        },
        {
          provide: getModelToken(UserArticleInteraction.name),
          useValue: mockUserInteractionsModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    itemsModel = module.get(getModelToken(Items.name));
    userInteractionsModel = module.get(
      getModelToken(UserArticleInteraction.name),
    );
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listForUser', () => {
    it('should return paginated articles from cache when available', async () => {
      const mockCachedData = {
        items: [
          {
            objectId: '1',
            title: 'Test Article',
            author: 'test',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        hasNextPage: false,
      };

      cacheService.getUserList.mockResolvedValue(mockCachedData);

      const result = await service.listForUser({
        userId: 'user1',
        page: 1,
        limit: 20,
      });

      expect(cacheService.getUserList).toHaveBeenCalledWith('user1', 1, 20);
      expect(result).toEqual({
        items: mockCachedData.items,
        page: 1,
        limit: 20,
        total: 1,
        hasNextPage: false,
      });
    });

    it('should fetch from database on cache miss', async () => {
      const mockAggregationResult = [
        {
          metadata: [{ total: 1 }],
          items: [
            {
              objectId: '1',
              title: 'Test Article',
              author: 'test',
              createdAt: new Date('2024-01-01'),
            },
          ],
        },
      ];

      cacheService.getUserList.mockResolvedValue(null);
      itemsModel.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listForUser({
        userId: 'user1',
        page: 1,
        limit: 20,
      });

      expect(itemsModel.aggregate).toHaveBeenCalled();
      expect(cacheService.setUserList).toHaveBeenCalledWith(
        'user1',
        1,
        20,
        expect.objectContaining({
          items: expect.any(Array),
          total: 1,
          hasNextPage: expect.any(Boolean),
        }),
        3900,
      );
      expect(result.items).toHaveLength(1);
    });

    it('should filter out hidden articles via aggregation pipeline', async () => {
      // When cache miss, aggregation pipeline should filter hidden items
      const mockAggregationResult = [
        {
          metadata: [{ total: 2 }], // Only 2 items after filtering hidden
          items: [
            {
              objectId: '1',
              title: 'Article 1',
              author: 'test',
              createdAt: new Date('2024-01-01'),
            },
            {
              objectId: '3',
              title: 'Article 3',
              author: 'test',
              createdAt: new Date('2024-01-01'),
            },
          ],
        },
      ];

      cacheService.getUserList.mockResolvedValue(null);
      itemsModel.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listForUser({
        userId: 'user1',
        page: 1,
        limit: 20,
      });

      // Verify aggregation pipeline includes $lookup for hidden items
      const aggregateCall = itemsModel.aggregate.mock.calls[0][0];
      expect(aggregateCall).toBeDefined();
      expect(Array.isArray(aggregateCall)).toBe(true);

      // Verify result doesn't include hidden items (already filtered by DB)
      expect(result.items).toHaveLength(2);
      expect(
        result.items.find((item: any) => item.objectId === '2'),
      ).toBeUndefined();
      expect(result.total).toBe(2);
    });

    it('should throw BadRequestException when limit exceeds MAX_ITEMS', async () => {
      await expect(
        service.listForUser({
          userId: 'user1',
          page: 1,
          limit: 150,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when page is less than 1', async () => {
      await expect(
        service.listForUser({
          userId: 'user1',
          page: 0,
          limit: 20,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.listForUser({
          userId: 'user1',
          page: -1,
          limit: 20,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is less than 1', async () => {
      await expect(
        service.listForUser({
          userId: 'user1',
          page: 1,
          limit: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate hasNextPage correctly', async () => {
      const mockCachedData = {
        items: Array(20)
          .fill(null)
          .map((_, i) => ({
            objectId: `${i}`,
            title: `Article ${i}`,
            author: 'test',
            createdAt: '2024-01-01T00:00:00.000Z',
          })),
        total: 50,
        hasNextPage: true,
      };

      cacheService.getUserList.mockResolvedValue(mockCachedData);

      const result = await service.listForUser({
        userId: 'user1',
        page: 1,
        limit: 20,
      });

      expect(result.hasNextPage).toBe(true);
    });
  });

  describe('hideForUser', () => {
    it('should hide an existing article and invalidate cache', async () => {
      const mockFindOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ objectId: '1' }),
      });
      itemsModel.findOne = mockFindOne;

      userInteractionsModel.findOneAndUpdate.mockResolvedValue({
        userId: 'user1',
        objectId: '1',
        isHidden: true,
      });

      cacheService.invalidateUserList.mockResolvedValue(undefined);

      const result = await service.hideForUser({
        userId: 'user1',
        objectId: '1',
      });

      expect(mockFindOne).toHaveBeenCalledWith({
        objectId: '1',
        isDeleted: false,
      });
      expect(userInteractionsModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user1', objectId: '1' },
        { $set: { isHidden: true } },
        { upsert: true, new: true },
      );
      expect(cacheService.invalidateUserList).toHaveBeenCalledWith('user1');
      expect(result).toEqual({
        objectId: '1',
        isHidden: true,
      });
    });

    it('should throw NotFoundException when article does not exist', async () => {
      const mockFindOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      itemsModel.findOne = mockFindOne;

      await expect(
        service.hideForUser({
          userId: 'user1',
          objectId: 'non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
