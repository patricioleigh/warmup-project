import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { JobState } from './schemas/job-state.schema';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly instanceId = process.env.INSTANCE_ID || process.env.HOSTNAME || `inst_${randomUUID()}`;

  constructor(@InjectModel(JobState.name) private readonly jobStates: Model<JobState>) {}

  async getState(jobName: string) {
    return this.jobStates.findOne({ jobName }).lean();
  }

  /**
   * Executes the job only if it can acquire a distributed lock in MongoDB.
   * This prevents duplicate runs across multiple instances.
   */
  async runExclusive<T extends Record<string, unknown> = Record<string, never>>(params: {
    jobName: string;
    lockTtlMs: number;
    run: (ctx: { jobRunId: string }) => Promise<{ itemsProcessed?: number; meta?: Record<string, unknown> } & T>;
  }): Promise<{ ran: false } | ({ ran: true; jobRunId: string } & Partial<T>)> {
    const now = new Date();
    const jobRunId = `job_${randomUUID()}`;
    const lockUntil = new Date(Date.now() + params.lockTtlMs);

    // Acquire lock if unlocked or expired
    const acquired = await this.jobStates.findOneAndUpdate(
      {
        jobName: params.jobName,
        $or: [{ lockUntil: { $exists: false } }, { lockUntil: { $lte: now } }],
      },
      {
        $set: {
          status: 'running',
          jobRunId,
          lockUntil,
          lockedBy: this.instanceId,
        },
        $unset: { errorId: 1 },
      },
      { upsert: true, new: true },
    );

    // If we didn't acquire (because another instance holds it), skip.
    if (!acquired || acquired.lockedBy !== this.instanceId || acquired.jobRunId !== jobRunId) {
      const current = await this.jobStates.findOne({ jobName: params.jobName }).lean();
      this.logger.warn({
        jobName: params.jobName,
        msg: 'job skipped: lock not acquired',
        lockUntil: current?.lockUntil,
        lockedBy: current?.lockedBy,
        status: current?.status,
        jobRunId: current?.jobRunId,
      });
      return { ran: false };
    }

    const start = Date.now();
    this.logger.log({ jobName: params.jobName, jobRunId, lockUntil, msg: 'job started' });

    try {
      const result = await params.run({ jobRunId });
      const durationMs = Date.now() - start;
      const itemsProcessed = (result as any)?.itemsProcessed;

      await this.jobStates.updateOne(
        { jobName: params.jobName, jobRunId, lockedBy: this.instanceId },
        {
          $set: {
            status: 'success',
            lastRun: new Date(),
            durationMs,
            itemsProcessed: typeof itemsProcessed === 'number' ? itemsProcessed : undefined,
            lockUntil: new Date(),
          },
          $unset: { lockedBy: 1 },
        },
      );

      this.logger.log({ jobName: params.jobName, jobRunId, durationMs, itemsProcessed, msg: 'job finished' });
      return { ran: true, jobRunId, ...(result as any) };
    } catch (err) {
      const durationMs = Date.now() - start;
      const errorId = `err_${randomUUID()}`;

      await this.jobStates.updateOne(
        { jobName: params.jobName, jobRunId, lockedBy: this.instanceId },
        {
          $set: {
            status: 'failed',
            lastRun: new Date(),
            durationMs,
            errorId,
            lockUntil: new Date(),
          },
          $unset: { lockedBy: 1 },
        },
      );

      this.logger.error({ jobName: params.jobName, jobRunId, errorId, durationMs, msg: 'job failed' }, err as any);
      return { ran: true, jobRunId, errorId } as any;
    }
  }
}

