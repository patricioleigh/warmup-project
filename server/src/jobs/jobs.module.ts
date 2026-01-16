import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobState, JobStateSchema } from './schemas/job-state.schema';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: JobState.name, schema: JobStateSchema }])],
  providers: [JobsService],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule {}

