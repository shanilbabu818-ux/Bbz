import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';

class ProductQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

@Controller('products')
export class CatalogController {
  @Get()
  list(@Query() query: ProductQueryDto) {
    return {
      data: [],
      meta: { page: 1, limit: 24, total: 0 },
      filters: query,
    };
  }
}
