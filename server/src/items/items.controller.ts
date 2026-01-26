import { Controller, Post, Query, Get, Patch, Param } from '@nestjs/common';
import { ItemsService } from './items.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('items')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post('sync')
  @ApiOperation({
    summary: 'Sync latest items from Hacker News',
    description:
      'Fetches and syncs the latest articles from Hacker News API based on query parameters',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search query term',
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
    description: 'Number of results per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully synced items',
    schema: {
      example: {
        query: 'nodejs',
        page: 0,
        hitsPerPage: 20,
        fetched: 20,
        kept: 18,
        unique: 18,
        upserted: 5,
        modified: 3,
        matched: 10,
      },
    },
  })
  sync(
    @Query('query') query?: string,
    @Query('page') page?: string,
    @Query('hitPerPage') hitsPerPage?: string,
  ) {
    return this.itemsService.syncLatest({
      query: query ?? 'node.js',
      page: page ? Number(page) : 0,
      hitsPerPage: hitsPerPage ? Number(hitsPerPage) : 20,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all non-deleted items',
    description: 'Returns a list of all items that are not marked as deleted',
  })
  @ApiResponse({
    status: 200,
    description: 'List of items retrieved successfully',
    schema: {
      example: [
        {
          objectId: '12345',
          title: 'Example Article',
          url: 'https://example.com',
          author: 'john_doe',
          createdAt: '2024-01-01T00:00:00.000Z',
          isDeleted: false,
        },
      ],
    },
  })
  async getItems() {
    return this.itemsService.findAllNotDeleted();
  }

  @Patch(':objectId/delete')
  @ApiOperation({
    summary: 'Mark an item as deleted',
    description: 'Soft deletes an item by marking it as deleted',
  })
  @ApiParam({
    name: 'objectId',
    description: 'The unique object ID of the item',
    example: '12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Item marked as deleted successfully',
    schema: {
      example: {
        objectId: '12345',
        isDeleted: true,
        changed: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Item not found',
  })
  async deleteItem(@Param('objectId') objectId: string) {
    return this.itemsService.markAsDeleted(objectId);
  }
}
