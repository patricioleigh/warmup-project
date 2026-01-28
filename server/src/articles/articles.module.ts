import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { Items, ItemsSchema } from '../items/schemas/items.schema';
import {
  UserArticleInteraction,
  UserArticleInteractionSchema,
} from './schemas/user-article-interaction.schema';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Items.name, schema: ItemsSchema },
      {
        name: UserArticleInteraction.name,
        schema: UserArticleInteractionSchema,
      },
    ]),
    CacheModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
