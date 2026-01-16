import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { UserArticleInteraction } from './schemas/user-article-interaction.schema';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectModel(UserArticleInteraction.name)
    private readonly interactions: Model<UserArticleInteraction>,
  ) {}

  async hideArticle(params: { userId: string; objectId: string }): Promise<{ objectId: string; isHidden: true }> {
    await this.interactions.findOneAndUpdate(
      { userId: params.userId, objectId: params.objectId },
      { $set: { isHidden: true } },
      { upsert: true, new: true },
    );
    return { objectId: params.objectId, isHidden: true };
  }

  async getHiddenObjectIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.interactions
      .find({ userId, isHidden: true })
      .select({ objectId: 1, _id: 0 })
      .lean();
    return rows.map((r: any) => String(r.objectId));
  }
}

