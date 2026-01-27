import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { ArticlesService } from './articles.service';
import { ListArticlesQueryDto } from './dto/list-articles.query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('articles')
@ApiBearerAuth()
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'List articles for authenticated user',
    description:
      'Returns paginated list of articles excluding ones hidden by the user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Articles retrieved successfully',
    schema: {
      example: {
        items: [
          {
            objectId: '12345',
            title: 'Example Article',
            url: 'https://example.com',
            author: 'john_doe',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 100,
        hasNextPage: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async list(
    @GetUser() user: { userId: string },
    @Query() query: ListArticlesQueryDto,
  ) {
    return this.articles.listForUser({
      userId: user.userId,
      page: query.page,
      limit: query.limit,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':objectId')
  @ApiOperation({
    summary: 'Hide an article for the authenticated user',
    description: 'Marks an article as hidden for the current user',
  })
  @ApiParam({
    name: 'objectId',
    description: 'The unique object ID of the article',
    example: '12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Article hidden successfully',
    schema: {
      example: {
        userId: '507f1f77bcf86cd799439011',
        objectId: '12345',
        hiddenAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async hide(
    @GetUser() user: { userId: string },
    @Param('objectId') objectId: string,
  ) {
    return this.articles.hideForUser({ userId: user.userId, objectId });
  }
}
