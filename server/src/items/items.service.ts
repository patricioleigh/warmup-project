import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Items } from './schemas/items.schema';
import { Model } from 'mongoose';
import { HnService } from 'src/hn/hn.service';
import { CleanHnItem } from 'src/hn/clean.types';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { JobsService } from '../jobs/jobs.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class ItemsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ItemsService.name);

  constructor(
    @InjectModel(Items.name) private ItemsModel: Model<Items>,
    private readonly hnService: HnService,
    private readonly jobs: JobsService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly cacheService: CacheService,
  ) {}

  onApplicationBootstrap() {
    const jobs = this.schedulerRegistry.getCronJobs();
    this.logger.log({
      msg: 'scheduler initialized',
      cronJobs: Array.from(jobs.keys()),
    });

    const hourlyJob =
      jobs.get('ItemsService.hourlySync') ??
      jobs.get('ItemsService_hourlySync') ??
      jobs.get('hourlySync');
    if (hourlyJob) {
      try {
        const nextDate = hourlyJob.nextDate() as any;
        const nextRun =
          typeof nextDate?.toISO === 'function'
            ? nextDate.toISO()
            : String(nextDate);
        this.logger.log({
          msg: 'hourlySync cron registered',
          nextRun,
        });
      } catch (e: any) {
        this.logger.warn({
          msg: 'hourlySync cron registered but next run unavailable',
          error: e?.message ?? e,
        });
      }
    } else {
      this.logger.warn({ msg: 'hourlySync cron not found in registry' });
    }
  }

  @Cron('0 * * * *')
  async hourlySync() {
    this.logger.log({ msg: 'hourlySync cron triggered' });
    this.logger.debug({
      msg: 'hourlySync attempting runExclusive lock',
      jobName: 'hn-hourly-sync',
    });
    const result = await this.jobs.runExclusive({
      jobName: 'hn-hourly-sync',
      // lock TTL: 10 minutes (job should finish far below this; prevents overlap across instances)
      lockTtlMs: 10 * 60 * 1000,
      run: async ({ jobRunId }) => {
        this.logger.log({
          jobRunId,
          msg: 'hourlySync runExclusive lock acquired',
        });
        const result = await this.syncLatest({
          query: 'nodejs',
          page: 0,
          hitsPerPage: 20,
        });
        const itemsProcessed =
          Number(result?.upserted ?? 0) + Number(result?.modified ?? 0);
        this.logger.log({ jobRunId, msg: 'hourlySync finished', result });
        return { itemsProcessed, result } as any;
      },
    });
    if (result?.ran === false) {
      this.logger.warn({
        msg: 'hourlySync skipped: runExclusive lock not acquired',
      });
    } else if (result?.ran && !(result as any).errorId) {
      // Invalidate all user caches so everyone sees new items immediately
      await this.cacheService.invalidateAllUserLists();
      this.logger.log({
        msg: 'hourlySync cache invalidated',
        jobRunId: result?.jobRunId,
      });
    } else {
      this.logger.log({
        msg: 'hourlySync runExclusive completed',
        jobRunId: result?.jobRunId,
      });
    }
  }

  async syncLatest(params?: {
    query?: string;
    page?: number;
    hitsPerPage?: number;
  }) {
    const query = params?.query ?? 'nodejs';
    const page = params?.page ?? 0;
    const hitsPerPAge = params?.hitsPerPage ?? 20;

    const cleanResponse = await this.hnService.fetchLatestClean(
      query,
      page,
      hitsPerPAge,
    );
    const hits: CleanHnItem[] = cleanResponse.hits;

    const uniqueById = new Map<string, CleanHnItem>();
    for (const h of hits) uniqueById.set(h.hnObjectId, h);
    const uniqueHits = [...uniqueById.values()];

    if (!uniqueHits.length) {
      return {
        query,
        page,
        hitsPerPAge,
        fetched: cleanResponse.fetched ?? 0,
        kept: 0,
        upserted: 0,
        modified: 0,
        matched: 0,
      };
    }

    const ops = uniqueHits.map((h) => ({
      updateOne: {
        filter: { objectId: h.hnObjectId },
        update: {
          $set: {
            objectId: h.hnObjectId,
            title: h.title,
            url: h.url ?? undefined,
            author: h.author,
            createdAt: new Date(h.createdAt),
          },
          $setOnInsert: {
            isDeleted: false,
          },
        },
        upsert: true,
      },
    }));

    let upserted = 0;
    let modified = 0;
    let matched = 0;

    try {
      const result: any = await this.ItemsModel.bulkWrite(ops, {
        ordered: false,
      });

      upserted =
        result?.upserterCount ??
        result?.result?.nUpserted ??
        result?.getRawResponde?.()?.nUpserted ??
        0;

      modified =
        result?.modifiedCount ??
        result?.result?.nModified ??
        result?.getRawResponse?.()?.nModified ??
        0;

      matched =
        result?.matchedCount ??
        result?.result?.nMatched ??
        result?.getRawResponse?.()?.nMatched ??
        0;

      return {
        query,
        page,
        hitsPerPAge,
        fetched: cleanResponse.fetched ?? hits.length,
        kept: hits.length,
        unique: uniqueHits.length,
        upserted,
        modified,
        matched,
      };
    } catch (e: any) {
      const writeErrors = e?.writeErrors?.map((we: any) => ({
        code: we?.code,
        errmsg: we?.errmsg,
      }));

      this.logger.error(
        `syncLatest bulkWrite failed: ${e?.message ?? e}`,
        e?.stack,
      );

      return {
        query,
        page,
        hitsPerPAge,
        fetched: cleanResponse.fetched ?? hits.length,
        kept: hits.length,
        unique: uniqueHits.length,
        upserted,
        modified,
        matched,
        error: e?.message ?? 'bulkWrite failed',
        writeErrors: writeErrors ?? null,
      };
    }
  }
}
