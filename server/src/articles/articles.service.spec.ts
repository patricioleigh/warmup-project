import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from './articles.service';
import { getModelToken } from '@nestjs/mongoose';
import { Items } from '../items/schemas/items.schema';
import { InteractionsService } from '../interactions/interactions.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let itemsModel: any;
  let interactionsService: any;
  let configService: any;
  let cacheService: any;

  beforeEach(async () => {
    const mockItemsModel = {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      countDocuments: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn(),
    };

    const mockInteractionsService = {
      getHiddenObjectIdsForUser: jest.fn(),
      hideArticle: jest.fn(),
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
      getGlobalList: jest.fn(),
      setGlobalList: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getModelToken(Items.name),
          useValue: mockItemsModel,
        },
        {
          provide: InteractionsService,
          useValue: mockInteractionsService,
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
    interactionsService = module.get<InteractionsService>(InteractionsService);
    configService = module.get<ConfigService>(ConfigService);
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
      };

      cacheService.getGlobalList.mockResolvedValue(mockCachedData);
      interactionsService.getHiddenObjectIdsForUser.mockResolvedValue([]);

      const result = await service.listForUser({
        userId: 'user1',
        page: 1,
        limit: 20,
      });

      expect(cacheService.getGlobalList).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual({
        items: mockCachedData.items,
        page: 1,
        limit: 20,
        total: 1,
        hasNextPage: false,
      });
    });

    it('should fetch from database on cache miss', async () => {
      const mockItems = [
        {
          objectId: '1',
          title: 'Test Article',
          author: 'test',
          createdAt: new Date('2024-01-01'),
        },
      ];

      cacheService.getGlobalList.mockResolvedValue(null);
      interactionsService.getHiddenObjectIdsForUser.mockResolvedValue([]);
      itemsModel.countDocuments.mockResolvedValue(1);
      itemsModel.lean.mockResolvedValue(mockItems);

      const result = await service.listForUser({
        userId: 'user1',
        page: 1,
        limit: 20,
      });

      expect(itemsModel.find).toHaveBeenCalledWith({ isDeleted: false });
      expect(cacheService.setGlobalList).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it('should filter out hidden articles', async () => {
      const mockCachedData = {
        items: [
          { objectId: '1', title: 'Article 1', author: 'test', createdAt: '2024-01-01T00:00:00.000Z' },
          { objectId: '2', title: 'Article 2', author: 'test', createdAt: '2024-01-01T00:00:00.000Z' },
          { objectId: '3', title: 'Article 3', author: 'test', createdAt: '2024-01-01T00:00:00.000Z' },
        ],
        total: 3,
      };

      cacheService.getGlobalList.mockResolvedValue(mockCachedData);
      interactionsService.getHiddenObjectIdsForUser.mockResolvedValue(['2']);

      const result = await service.listForUser({
        userId: 'user1',
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.find((item: any) => item.objectId === '2')).toBeUndefined();
      expect(result.total).toBe(2); // 3 - 1 hidden
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
      };

      cacheService.getGlobalList.mockResolvedValue(mockCachedData);
      interactionsService.getHiddenObjectIdsForUser.mockResolvedValue([]);

      const result = await service.listForUser({
        userId: 'user1',
        page: 1,
        limit: 20,
      });

      expect(result.hasNextPage).toBe(true);
    });
  });

  describe('hideForUser', () => {
    it('should hide an existing article', async () => {
      const mockFindOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ objectId: '1' }),
      });
      itemsModel.findOne = mockFindOne;

      interactionsService.hideArticle.mockResolvedValue({
        userId: 'user1',
        objectId: '1',
        hiddenAt: new Date(),
      });

      const result = await service.hideForUser({
        userId: 'user1',
        objectId: '1',
      });

      expect(mockFindOne).toHaveBeenCalledWith({
        objectId: '1',
        isDeleted: false,
      });
      expect(interactionsService.hideArticle).toHaveBeenCalledWith({
        userId: 'user1',
        objectId: '1',
      });
      expect(result).toBeDefined();
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
