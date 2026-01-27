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
import { InteractionsService } from '../interactions/interactions.service';
import { CacheService } from '../cache/cache.service';

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
    private readonly interactions: InteractionsService,
    private readonly config: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async listForUser(params: { userId: string; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const maxItems = this.config.get<number>('MAX_ITEMS') ?? 100;
    if (limit > maxItems) {
      throw new BadRequestException({
        code: ErrorCode.PAGINATION_LIMIT_EXCEEDED,
        message: `limit must be <= ${maxItems}`,
      });
    }

    const hiddenIds = await this.interactions.getHiddenObjectIdsForUser(
      params.userId,
    );
    const hiddenSet = new Set(hiddenIds);

    const skip = (page - 1) * limit;

    const cached = await this.cacheService.getGlobalList<{
      items: ArticleDto[];
      total: number;
    }>(page, limit);

    let total = cached?.total ?? 0;
    let items: ArticleDto[] = cached?.items ?? [];

    if (!cached) {
      this.logger.debug({ msg: 'cache miss article list', page, limit });
      const [dbTotal, rows] = await Promise.all([
        this.items.countDocuments({ isDeleted: false }),
        this.items
          .find({ isDeleted: false })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select({
            objectId: 1,
            title: 1,
            url: 1,
            author: 1,
            createdAt: 1,
            _id: 0,
          })
          .lean<ItemsListRow[]>(),
      ]);

      total = dbTotal;
      items = rows.map((r) => {
        const createdAt = asSafeDate(r.createdAt);

        return {
          objectId: asSafeString(r.objectId),
          title: asSafeString(r.title),
          url: r.url ? asSafeString(r.url) : undefined,
          author: asSafeString(r.author),
          createdAt: (createdAt ?? new Date(0)).toISOString(),
        };
      });

      const ttlSeconds = this.config.get<number>('REDIS_TTL_SECONDS') ?? 3900;
      await this.cacheService.setGlobalList(
        page,
        limit,
        { items, total },
        ttlSeconds,
      );
    } else {
      this.logger.debug({
        msg: 'cache hit article list',
        page,
        limit,
        count: items.length,
      });
    }

    const filteredItems = items.filter((item) => !hiddenSet.has(item.objectId));
    const adjustedTotal = Math.max(total - hiddenIds.length, 0);

    const hasNextPage = skip + filteredItems.length < adjustedTotal;
    const response = {
      items: filteredItems,
      page,
      limit,
      total: adjustedTotal,
      hasNextPage,
    };

    const maxBytes = this.config.get<number>('MAX_RESPONSE_BYTES') ?? 262144;
    const bytes = Buffer.byteLength(JSON.stringify(response), 'utf8');
    if (bytes > maxBytes) {
      throw new UnprocessableEntityException({
        code: ErrorCode.RESPONSE_TOO_LARGE,
        message: 'Response too large; reduce limit or add filters',
      });
    }

    return response;
  }

  async hideForUser(params: { userId: string; objectId: string }) {
    const existing = await this.items
      .findOne({ objectId: params.objectId, isDeleted: false })
      .select({ objectId: 1 });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Article not found',
      });
    }
    return this.interactions.hideArticle(params);
  }
}
