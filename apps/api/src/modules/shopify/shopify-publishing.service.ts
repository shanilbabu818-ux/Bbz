import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@foxiby/database';
import { ShopifyHttpAdapter } from './shopify.adapter';

@Injectable()
export class ShopifyPublishingService {
  private readonly adapter: ShopifyHttpAdapter;

  constructor(config: ConfigService) {
    this.adapter = new ShopifyHttpAdapter(config);
  }

  async publishApprovedProduct(productId: string, organizationId: string, actorUserId?: string) {
    const product = await prisma.product.findFirst({ where: { id: productId, organizationId } });
    if (!product) throw new Error('Product not found');
    if (product.status !== 'APPROVED') throw new Error('Only approved products can be published to Shopify');
    if (product.shopifyProductId) return { externalProductId: product.shopifyProductId, alreadyPublished: true };

    const idempotencyKey = `shopify-product:${organizationId}:${product.id}`;
    const result = await this.adapter.createProduct({
      title: product.title,
      description: product.description,
      price: product.sellingPrice.toFixed(2),
      images: Array.isArray(product.imageUrls) ? product.imageUrls.filter((item): item is string => typeof item === 'string') : [],
    }, idempotencyKey);

    await prisma.$transaction(async (tx) => {
      const current = await tx.product.findFirst({ where: { id: product.id, organizationId, status: 'APPROVED', shopifyProductId: null } });
      if (!current) return;
      await tx.product.update({ where: { id: product.id }, data: { shopifyProductId: result.externalProductId, shopifyPublishedAt: new Date(), status: 'PUBLISHED' } });
      await tx.auditLog.create({ data: { organizationId, action: 'PRODUCT_SHOPIFY_PUBLISHED', entityType: 'PRODUCT', entityId: product.id, metadata: { actorUserId, externalProductId: result.externalProductId, idempotencyKey } } });
    });

    return { ...result, alreadyPublished: false };
  }
}
