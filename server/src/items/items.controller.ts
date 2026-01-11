import { Controller, Post, Query, Get} from '@nestjs/common';
import { ItemsService } from './items.service';


@Controller('items')
export class ItemsController {
    constructor(private readonly itemsService: ItemsService){}

    @Post('sync')
    sync(
        @Query('query') query?: string,
        @Query('page') page?: string,
        @Query('hitPerPage') hitsPerPage?: string,
    ){
        return this.itemsService.syncLatest({
            query: query ?? 'node.js',
            page: page ? Number(page) : 0,
            hitsPerPage: hitsPerPage ? Number(hitsPerPage) : 20,
        });
    }

    @Get()
    async getItems(
        @Query('page') page?: string,
        @Query('limit') limit?: string,      
    ){
        return this.itemsService.findNotDeleted({
            page: page ? Number(page): 1,
            limit: limit ? Number(limit): 20,
        });
    }



}
