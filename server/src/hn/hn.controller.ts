import { Controller, Get, Query } from '@nestjs/common';
import { HnService } from './hn.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('hacker-news')
@Controller('hn')
export class HnController {
  constructor(private readonly hn: HnService) {}

  @Get('fetch')
  @ApiOperation({
    summary: 'Fetch raw data from Hacker News API',
    description: 'Returns unprocessed data from the Hacker News Algolia API',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search query',
    example: 'nodejs',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 0,
  })
  @ApiQuery({
    name: 'hitPerPage',
    required: false,
    description: 'Results per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Raw Hacker News data retrieved',
  })
  async fetch(
    @Query('query') query?: string,
    @Query('page') page?: string,
    @Query('hitPerPage') hitsPerPage?: string,
  ) {
    return this.hn.fetchLatest(
      query ?? 'node.js',
      page ? Number(page) : 0,
      hitsPerPage ? Number(hitsPerPage) : 20,
    );
  }

  @Get('fetch-clean')
  @ApiOperation({
    summary: 'Fetch cleaned data from Hacker News API',
    description:
      'Returns processed and cleaned data from Hacker News with only essential fields',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search query',
    example: 'nodejs',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 0,
  })
  @ApiQuery({
    name: 'hitPerPage',
    required: false,
    description: 'Results per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleaned Hacker News data retrieved',
    schema: {
      example: {
        query: 'nodejs',
        page: 0,
        hitPerPage: 20,
        fetched: 20,
        kept: 18,
        hits: [
          {
            hnObjectId: '12345',
            title: 'Example Article',
            url: 'https://example.com',
            author: 'john_doe',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      },
    },
  })
  async fetchClean(
    @Query('query') query?: string,
    @Query('page') page?: string,
    @Query('hitPerPage') hitsPerPage?: string,
  ) {
    return this.hn.fetchLatestClean(
      query ?? 'node.js',
      page ? Number(page) : 0,
      hitsPerPage ? Number(hitsPerPage) : 20,
    );
  }
}
