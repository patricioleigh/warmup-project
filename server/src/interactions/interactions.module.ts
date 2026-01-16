import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserArticleInteraction,
  UserArticleInteractionSchema,
} from './schemas/user-article-interaction.schema';
import { InteractionsService } from './interactions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserArticleInteraction.name, schema: UserArticleInteractionSchema },
    ]),
  ],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}

