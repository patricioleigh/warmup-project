import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Items } from './schemas/items.schema';
import { Model } from 'mongoose';
import { HnService } from 'src/hn/hn.service';
import { CleanHnItem } from 'src/hn/clean.types';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ItemsService {
    private readonly logger = new Logger(ItemsService.name);
    private isSyncRunnning = false;

    constructor(
        @InjectModel(Items.name) private ItemsModel: Model<Items>,
        private readonly hnService: HnService,
    ){}

    @Cron('* * * * *')
    async hourlySync(){
        if (this.isSyncRunnning){
            this.logger.warn('hourlySync skipped: previous sync still running');
            return;
        }
        this.isSyncRunnning = true;
        try{
            this.logger.log('hourlySync started');
            const result = await this.syncLatest({ query: 'node.js', page: 0, hitsPerPage: 20});
            this.logger.log(
                `hourlySync finished: fetched = ${result?.fetched} kept = ${result?.kept} upserted = ${result?.upserted} modified = ${result?.modified}`,
            );
        } catch (e: any){
            this.logger.error(`hourlySync failed: ${e?.message ?? e}`, e?.stack);
        } finally {
            this.isSyncRunnning = false;
        }
    }



    async syncLatest(params?: {query?: string; page?: number; hitsPerPage?: number}){
        const query = params?.query ?? 'node.js';
        const page = params?.page ?? 0;
        const hitsPerPAge = params?.hitsPerPage ?? 20;

        const cleanResponse = await this.hnService.fetchLatestClean(query, page, hitsPerPAge);
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
                filter: { objectId: h.hnObjectId},
                update: {
                    $set: {
                        objectID: h.hnObjectId,
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
            const result: any = await this.ItemsModel.bulkWrite(ops, {ordered:false});

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
            fetchedd: cleanResponse.fetched ?? hits.length,
            kept: hits.length,
            unique: uniqueHits.length,
            upserted,
            modified,
            matched,
        };
        } catch (e: any){
            const writeErrors = e?.writeErrors?.map((we:any) => ({
                code: we?.code,
                errmsg: we?.errmsg,
            }));

            this.logger.error(`synLatest bulkwrite failed: ${e?.message ?? e}`, e?.stack);

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
                error:e?.message ?? 'bilWrite failed',
                writeErrors: writeErrors ?? null,
            };
        }
    }


    async findAll(){
        return this.ItemsModel.find({}).sort({createAt: -1}).limit(50).lean();
    }


    async findNotDeleted(params?: { page?: number; limit?: number}){
        const page = Math.max(1, params?.page ?? 1);
        const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
        const skip = (page - 1) * limit;

        const filter = { isDeleted: false};

        const [items, total] = await Promise.all([
            this.ItemsModel
                .find(filter)
                .sort({createdAt: -1})
                .skip(skip)
                .limit(limit)
                .lean(),
            this.ItemsModel.countDocuments(filter),
        ]);

        return {
            page,
            limit,
            total,
            items,
        };
    }

    async markAsDeleted(objectId: string){
        const res = await this.ItemsModel.updateOne(
            {objectId, isDeleted:false},
            { $set: { isDeleted: true}},
        );

        if (res.matchedCount === 0){
            const exists = await this.ItemsModel.exists({objectId});
            if (!exists) throw new NotFoundException(`Iem not foun: ${objectId}`);
            return { objectId, isDeleted: true, changued: false};
        }

        return {objectId, isDeleted: true, changed: true};
    }

    async findAllNotDeleted() {
        try{
            return await this.ItemsModel
                .find({isDeleted: false})
                .sort({createdAt: -1})
                .lean();            
        } catch (e:any){
            this.logger.error(`findAllNotDeleted failed: ${e?.message ?? e}`, e.stack);
            throw new InternalServerErrorException('Failed to fetch items');
        }
    }
}
