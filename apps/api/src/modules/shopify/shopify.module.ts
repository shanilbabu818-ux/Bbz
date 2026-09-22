import { Module } from '@nestjs/common';
import { ShopifyPublishingService } from './shopify-publishing.service';
import { ShopifyReconciliationService } from './shopify-reconciliation.service';

@Module({ providers: [ShopifyPublishingService, ShopifyReconciliationService], exports: [ShopifyPublishingService, ShopifyReconciliationService] })
export class ShopifyModule {}
