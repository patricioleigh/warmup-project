import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Items } from '../items/schemas/items.schema';
import { ErrorCode } from '../common/error-codes';
import { CacheService } from '../cache/cache.service';
import { UserArticleInteraction } from './schemas/user-article-interaction.schema';

type ArticleDto = {
  objectId: string;
  title: string;
  url?: string;
  author: string;
  createdAt: string;
};

type ItemsListRow = {
  objectId?: unknown;
  title?: unknown;
  url?: unknown;
  author?: unknown;
  createdAt?: unknown;
};

function asSafeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'bigint') return value.toString();
  return '';
}

function asSafeDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    @InjectModel(Items.name) private readonly items: Model<Items>,
    @InjectModel(UserArticleInteraction.name)
    private readonly userInteractions: Model<UserArticleInteraction>,
    private readonly config: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async listForUser(params: { userId: string; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    // Validation: page must be >= 1
    if (page < 1) {
      throw new BadRequestException({
        code: ErrorCode.PAGINATION_LIMIT_EXCEEDED,
        message: 'page must be >= 1',
      });
    }

    // Validation: limit must be within bounds
    const maxItems = this.config.get<number>('MAX_ITEMS') ?? 100;
    if (limit > maxItems || limit < 1) {
      throw new BadRequestException({
        code: ErrorCode.PAGINATION_LIMIT_EXCEEDED,
        message: `limit must be between 1 and ${maxItems}`,
      });
    }

    // Check cache first (user-specific)
    const cached = await this.cacheService.getUserList<{
      items: ArticleDto[];
      total: number;
      hasNextPage: boolean;
    }>(params.userId, page, limit);

    if (cached) {
      this.logger.debug({
        msg: 'cache hit user list',
        userId: params.userId,
        page,
        limit,
        count: cached.items.length,
      });

      // Early size validation before returning cached data
      const responseForValidation = {
        items: cached.items,
        page,
        limit,
        total: cached.total,
        hasNextPage: cached.hasNextPage,
      };
      const estimatedSize = this.estimateResponseSize(responseForValidation);
      const maxBytes = this.config.get<number>('MAX_RESPONSE_BYTES') ?? 262144;
      if (estimatedSize > maxBytes) {
        throw new UnprocessableEntityException({
          code: ErrorCode.RESPONSE_TOO_LARGE,
          message: 'Response too large; reduce limit or add filters',
        });
      }

      return responseForValidation;
    }

    // Cache miss: query database with aggregation
    this.logger.debug({
      msg: 'cache miss user list',
      userId: params.userId,
      page,
      limit,
    });

    const skip = (page - 1) * limit;

    // Use MongoDB aggregation to let the database do the heavy lifting
    // This solves the N+1 problem and ensures correct pagination
    const pipeline: any[] = [
      // 1. Filter non-deleted items
      { $match: { isDeleted: false } },
      // 2. Left join with user interactions to check if hidden
      {
        $lookup: {
          from: 'userarticleinteractions',
          let: { itemObjectId: '$objectId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$objectId', '$$itemObjectId'] },
                    { $eq: ['$userId', params.userId] },
                    { $eq: ['$isHidden', true] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'hiddenInteraction',
        },
      },
      // 3. Filter out hidden items
      { $match: { hiddenInteraction: { $size: 0 } } },
      // 4. Sort by createdAt descending
      { $sort: { createdAt: -1 as const } },
      // 5. Facet to get both count and paginated results in one query
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                objectId: 1,
                title: 1,
                url: 1,
                author: 1,
                createdAt: 1,
                _id: 0,
              },
            },
          ],
        },
      },
    ];

    const [result] = await this.items.aggregate(pipeline);

    const total = result.metadata[0]?.total ?? 0;
    const rows = result.items as ItemsListRow[];

    // Transform and validate data
    const items: ArticleDto[] = rows.map((r) => {
      const createdAt = asSafeDate(r.createdAt);

      // Log warning if data is corrupted
      if (!createdAt) {
        this.logger.warn({
          msg: 'corrupted createdAt field',
          objectId: r.objectId,
        });
      }

      return {
        objectId: asSafeString(r.objectId),
        title: asSafeString(r.title),
        url: r.url ? asSafeString(r.url) : undefined,
        author: asSafeString(r.author),
        createdAt: createdAt
          ? createdAt.toISOString()
          : new Date(0).toISOString(),
      };
    });

    const hasNextPage = skip + items.length < total;

    const response = {
      items,
      page,
      limit,
      total,
      hasNextPage,
    };

    // Validate response size BEFORE caching
    const estimatedSize = this.estimateResponseSize(response);
    const maxBytes = this.config.get<number>('MAX_RESPONSE_BYTES') ?? 262144;
    if (estimatedSize > maxBytes) {
      throw new UnprocessableEntityException({
        code: ErrorCode.RESPONSE_TOO_LARGE,
        message: 'Response too large; reduce limit or add filters',
      });
    }

    // Cache the result (user-specific)
    const ttlSeconds = this.config.get<number>('REDIS_TTL_SECONDS') ?? 3900;
    await this.cacheService.setUserList(
      params.userId,
      page,
      limit,
      { items, total, hasNextPage },
      ttlSeconds,
    );

    return response;
  }

  /**
   * Estimate response size without full JSON.stringify
   * This is much faster for large responses
   */
  private estimateResponseSize(response: {
    items: ArticleDto[];
    total: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
  }): number {
    // Base overhead for JSON structure
    let size = 100; // {"items":[],"page":N,"limit":N,"total":N,"hasNextPage":false}

    // Estimate each item
    for (const item of response.items) {
      // {"objectId":"","title":"","url":"","author":"","createdAt":""}
      size += 80; // JSON overhead
      size += item.objectId.length;
      size += item.title.length;
      size += item.url ? item.url.length : 0;
      size += item.author.length;
      size += 24; // ISO date string length
    }

    return size;
  }

  async hideForUser(params: { userId: string; objectId: string }) {
    // Verify article exists
    const existing = await this.items
      .findOne({ objectId: params.objectId, isDeleted: false })
      .select({ objectId: 1 });

    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Article not found',
      });
    }

    // Mark as hidden in database
    await this.userInteractions.findOneAndUpdate(
      { userId: params.userId, objectId: params.objectId },
      { $set: { isHidden: true } },
      { upsert: true, new: true },
    );

    // Invalidate all cached list pages for this user
    await this.cacheService.invalidateUserList(params.userId);

    this.logger.debug({
      msg: 'article hidden and cache invalidated',
      objectId: params.objectId,
      userId: params.userId,
    });

    return { objectId: params.objectId, isHidden: true };
  }
}
