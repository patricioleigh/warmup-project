import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Items, ItemsSchema } from './schemas/items.schema';
import { ItemsService } from './items.service';
import { HnModule } from 'src/hn/hn.module';
import { ItemsController } from './items.controller';
import { JobsModule } from '../jobs/jobs.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Items.name,
        schema: ItemsSchema,
      },
    ]),
    HnModule,
    JobsModule,
    CacheModule,
  ],
  providers: [ItemsService],
  controllers: [ItemsController],
})
export class ItemsModule {}
