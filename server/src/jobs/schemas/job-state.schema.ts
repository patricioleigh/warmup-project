import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type JobStatus = 'idle' | 'running' | 'success' | 'failed';

@Schema({ timestamps: true })
export class JobState {
  @Prop({ required: true, unique: true, index: true })
  jobName!: string;

  @Prop({ required: true, default: 'idle', index: true })
  status!: JobStatus;

  @Prop()
  lastRun?: Date;

  @Prop()
  durationMs?: number;

  @Prop()
  itemsProcessed?: number;

  @Prop()
  jobRunId?: string;

  @Prop()
  errorId?: string;

  // Distributed lock fields
  @Prop({ index: true })
  lockUntil?: Date;

  @Prop()
  lockedBy?: string;
}

export const JobStateSchema = SchemaFactory.createForClass(JobState);
