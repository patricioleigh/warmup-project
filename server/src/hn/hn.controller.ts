import { Controller, Get, Query } from '@nestjs/common';
import { HnService } from './hn.service';

@Controller('hn')
export class HnController {
    constructor(private readonly hn:HnService){}

    @Get('fetch')
    async fetch(
        @Query('query') query?: string,
        @Query('page') page?: string,
        @Query('hitPerPage') hitsPerPage?: string,
    ){
        return this.hn.fetchLatest(
            query ?? 'node.js',
            page ? Number(page): 0,
            hitsPerPage ? Number(hitsPerPage): 20,
        );
    }


    @Get('fetch-clean')
    async fetchClean(
        @Query('query') query?: string,
        @Query('page') page?: string,
        @Query('hitPerPage') hitsPerPage?: string,
    ){
        return this.hn.fetchLatestClean(
            query ?? 'node.js',
            page ? Number(page): 0,
            hitsPerPage ? Number(hitsPerPage): 20,
        );
    }  
    
    
  
    
}
