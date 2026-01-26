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

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
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
  async hide(
    @GetUser() user: { userId: string },
    @Param('objectId') objectId: string,
  ) {
    return this.articles.hideForUser({ userId: user.userId, objectId });
  }
}
