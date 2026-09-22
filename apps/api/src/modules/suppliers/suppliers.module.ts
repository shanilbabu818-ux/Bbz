import { Module } from '@nestjs/common';
import { ShopifyModule } from '../shopify/shopify.module';
import { SuppliersModule } from './suppliers.module';

@Module({ imports: [ShopifyModule], exports: [ShopifyModule] })
export class SuppliersModule {}
