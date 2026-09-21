import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { CatalogService } from './catalog.service';

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
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@Query() query: ProductQueryDto) {
    const data = this.catalog.list(query.search, query.category);
    return { data, meta: { page: 1, limit: data.length, total: data.length }, filters: query };
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    const product = this.catalog.findBySlug(slug);
    if (!product) throw new NotFoundException('Product not found');
    return { data: product };
  }
}
