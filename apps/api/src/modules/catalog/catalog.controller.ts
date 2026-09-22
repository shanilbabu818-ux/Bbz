import { Body, Controller, Get, Headers, Post, Query, UnauthorizedException } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { AuthService } from '../auth/auth.service';
import { CreateProductDto } from './create-product.dto';
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
  constructor(private readonly catalogService: CatalogService, private readonly authService: AuthService) {}

  private getAuth(authorization: string | undefined) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token is required');
    return this.authService.verifyToken(authorization.slice(7));
  }

  @Get()
  async list(@Headers('authorization') authorization: string | undefined, @Query() query: ProductQueryDto) {
    const auth = this.getAuth(authorization);
    const data = await this.catalogService.list(auth.organizationId, query.category, query.search);
    return { data, meta: { page: 1, limit: 24, total: data.length }, filters: query };
  }

  @Post()
  async create(@Headers('authorization') authorization: string | undefined, @Body() input: CreateProductDto) {
    const auth = this.getAuth(authorization);
    return { data: await this.catalogService.create(auth.organizationId, input) };
  }
}
