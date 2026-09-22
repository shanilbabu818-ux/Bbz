import { Body, Controller, Get, Headers, Post, Query, UnauthorizedException } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './create-product.dto';

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
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async list(@Headers('x-organization-id') organizationId: string | undefined, @Query() query: ProductQueryDto) {
    if (!organizationId) throw new UnauthorizedException('Organization context is required');
    const data = await this.catalogService.list(organizationId, query.category, query.search);
    return { data, meta: { page: 1, limit: 24, total: data.length }, filters: query };
  }

  @Post()
  async create(@Headers('x-organization-id') organizationId: string | undefined, @Body() input: CreateProductDto) {
    if (!organizationId) throw new UnauthorizedException('Organization context is required');
    return { data: await this.catalogService.create(organizationId, input) };
  }
}
