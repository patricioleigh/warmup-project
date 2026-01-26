import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { UserArticleInteraction } from './schemas/user-article-interaction.schema';
import { CacheService } from '../cache/cache.service';

const EMPTY_SENTINEL = '__none__';

@Injectable()
export class InteractionsService {
  private readonly logger = new Logger(InteractionsService.name);

  constructor(
    @InjectModel(UserArticleInteraction.name)
    private readonly interactions: Model<UserArticleInteraction>,
    private readonly cacheService: CacheService,
  ) {}

  async hideArticle(params: {
    userId: string;
    objectId: string;
  }): Promise<{ objectId: string; isHidden: true }> {
    await this.interactions.findOneAndUpdate(
      { userId: params.userId, objectId: params.objectId },
      { $set: { isHidden: true } },
      { upsert: true, new: true },
    );
    const key = this.cacheService.getUserHiddenKey(params.userId);
    await this.cacheService.sadd(key, params.objectId);
    await this.cacheService.srem(key, EMPTY_SENTINEL);
    this.logger.debug({
      msg: 'cache write-through hide',
      key,
      objectId: params.objectId,
    });
    return { objectId: params.objectId, isHidden: true };
  }

  async getHiddenObjectIdsForUser(userId: string): Promise<string[]> {
    const key = this.cacheService.getUserHiddenKey(userId);
    const cached = await this.cacheService.smembers(key);
    if (cached !== null) {
      const exists = await this.cacheService.exists(key);
      if (exists) {
        this.logger.debug({
          msg: 'cache hit hidden ids',
          key,
          count: cached.length,
        });
        return cached.filter((id) => id !== EMPTY_SENTINEL);
      }
    }

    this.logger.debug({ msg: 'cache miss hidden ids', key });
    const rows = await this.interactions
      .find({ userId, isHidden: true })
      .select({ objectId: 1, _id: 0 })
      .lean();
    const hiddenIds = rows.map((r: any) => String(r.objectId));

    if (hiddenIds.length > 0) {
      await Promise.all(hiddenIds.map((id) => this.cacheService.sadd(key, id)));
    } else {
      await this.cacheService.sadd(key, EMPTY_SENTINEL);
    }
    this.logger.debug({
      msg: 'cache hydrated hidden ids',
      key,
      count: hiddenIds.length,
    });

    return hiddenIds;
  }
}
