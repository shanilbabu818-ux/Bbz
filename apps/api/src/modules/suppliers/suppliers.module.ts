import { Module } from '@nestjs/common';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({ imports: [ShopifyModule], exports: [ShopifyModule] })
export class SuppliersModule {}
