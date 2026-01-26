import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserArticleInteraction,
  UserArticleInteractionSchema,
} from './schemas/user-article-interaction.schema';
import { InteractionsService } from './interactions.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserArticleInteraction.name, schema: UserArticleInteractionSchema },
    ]),
    CacheModule,
  ],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}

