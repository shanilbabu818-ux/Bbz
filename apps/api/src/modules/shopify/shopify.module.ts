import { Module } from '@nestjs/common';
import { ShopifyPublishingService } from './shopify-publishing.service';

@Module({ providers: [ShopifyPublishingService], exports: [ShopifyPublishingService] })
export class ShopifyModule {}
