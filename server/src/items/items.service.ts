import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Items } from './schemas/items.schema';
import { Model } from 'mongoose';
import { HnService } from 'src/hn/hn.service';
import { CleanHnItem } from 'src/hn/clean.types';

@Injectable()
export class ItemsService {
    constructor(
        @InjectModel(Items.name) private ItemsModel: Model<Items>,
        private readonly hnService: HnService,
    ){}

    async syncLatest(params?: {query?: string; page?: number; hitsPerPage?: number}){
        const query = params?.query ?? 'node.js';
        const page = params?.page ?? 0;
        const hitsPerPAge = params?.hitsPerPage ?? 20;

        const cleanResponse = await this.hnService.fetchLatestClean(query, page, hitsPerPAge);
        const hits: CleanHnItem[] = cleanResponse.hits;

        if (!hits.length) {
            return {
                query,
                page,
                hitsPerPAge,
                fetched: cleanResponse.fetched ?? 0,
                kept: 0,
                upserted: 0,
                modified: 0,
                matched: 0,
                totalDocsAfter: await this.ItemsModel.countDocuments(),
            };
        }

        const ops = hits.map((h) => ({
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

        const result = await this.ItemsModel.bulkWrite(ops, {ordered:false});

        const total = await this.ItemsModel.countDocuments();
        const sample = await this.ItemsModel.findOne().lean();

        return {
            query,
            page,
            hitsPerPAge,
            fetchedd: cleanResponse.fetched ?? hits.length,
            kept: hits.length,
            upserted: (result as any).upserterCount ?? 0,
            modified: (result as any).modifiedCount ?? 0,
            matched: (result as any).matchedCount ?? 0,
            bulkWriteResult: result,
            totalDocsAfter: total, 
            sample,
            dbName: this.ItemsModel.db.name,
            collectionName: this.ItemsModel.db.collection.name,
        };
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


}
