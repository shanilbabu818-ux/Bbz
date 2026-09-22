import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopifyPublishingService } from './shopify-publishing.service';

@Injectable()
export class ShopifyReconciliationService {
  constructor(private readonly config: ConfigService, private readonly publishing: ShopifyPublishingService) {}

  async runOnce(): Promise<number> {
    return this.publishing.reconcileDueProducts(Number(this.config.get('SHOPIFY_RECONCILIATION_BATCH_SIZE', 50)));
  }
}
