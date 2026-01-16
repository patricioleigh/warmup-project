import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Items } from '../items/schemas/items.schema';
import { ErrorCode } from '../common/error-codes';
import { InteractionsService } from '../interactions/interactions.service';

type ArticleDto = {
  objectId: string;
  title: string;
  url?: string;
  author: string;
  createdAt: string;
};

@Injectable()
export class ArticlesService {
  constructor(
    @InjectModel(Items.name) private readonly items: Model<Items>,
    private readonly interactions: InteractionsService,
    private readonly config: ConfigService,
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

    const hiddenIds = await this.interactions.getHiddenObjectIdsForUser(params.userId);

    const filter: any = { isDeleted: false };
    if (hiddenIds.length) filter.objectId = { $nin: hiddenIds };

    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      this.items.countDocuments(filter),
      this.items
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select({ objectId: 1, title: 1, url: 1, author: 1, createdAt: 1, _id: 0 })
        .lean(),
    ]);

    const items: ArticleDto[] = (rows as any[]).map((r) => ({
      objectId: String(r.objectId),
      title: String(r.title),
      url: r.url ? String(r.url) : undefined,
      author: String(r.author),
      createdAt: new Date(r.createdAt).toISOString(),
    }));

    const hasNextPage = skip + items.length < total;
    const response = { items, page, limit, total, hasNextPage };

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
    const existing = await this.items.findOne({ objectId: params.objectId, isDeleted: false }).select({ objectId: 1 });
    if (!existing) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Article not found' });
    }
    return this.interactions.hideArticle(params);
  }
}

