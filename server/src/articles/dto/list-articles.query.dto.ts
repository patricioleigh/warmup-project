import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ListArticlesQueryDto {
  @ApiProperty({
    description: 'Page number',
    required: false,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Items per page (max determined by MAX_ITEMS config)',
    required: false,
    minimum: 1,
    maximum: 1000000,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000) // hard upper bound; MAX_ITEMS enforced at runtime from config
  limit?: number;
}
