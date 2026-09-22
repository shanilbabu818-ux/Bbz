import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@foxiby/database';
import { ShopifyApiError, ShopifyHttpAdapter } from './shopify.adapter';

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60 * 60_000, 2 * 60 * 60_000];

@Injectable()
export class ShopifyPublishingService {
  private readonly adapter: ShopifyHttpAdapter;
  constructor(config: ConfigService) { this.adapter = new ShopifyHttpAdapter(config); }

  async publishApprovedProduct(productId: string, organizationId: string, actorUserId?: string) {
    const product = await prisma.product.findFirst({ where: { id: productId, organizationId } });
    if (!product) throw new Error('Product not found');
    if (product.status !== 'APPROVED' && product.shopifyPublicationStatus !== 'RETRY_WAIT') throw new Error('Only approved products can be published to Shopify');
    if (product.shopifyProductId) return { externalProductId: product.shopifyProductId, alreadyPublished: true };
    await prisma.product.update({ where: { id: product.id }, data: { shopifyPublicationStatus: 'PUBLISHING', shopifyLastError: null, shopifyPublishAttempts: { increment: 1 } } });
    const idempotencyKey = `shopify-product:${organizationId}:${product.id}`;
    try {
      const existing = await this.adapter.findProduct(product.id);
      const result = existing ?? await this.adapter.createProduct({ title: product.title, description: product.description, price: product.sellingPrice.toFixed(2), images: Array.isArray(product.imageUrls) ? product.imageUrls.filter((item): item is string => typeof item === 'string') : [], foxibyProductId: product.id }, idempotencyKey);
      await prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id: product.id }, data: { shopifyProductId: result.externalProductId, shopifyPublishedAt: new Date(), shopifyLastCheckedAt: new Date(), shopifyLastError: null, shopifyNextRetryAt: null, shopifyPublicationStatus: 'PUBLISHED', status: 'PUBLISHED' } });
        await tx.auditLog.create({ data: { organizationId, action: existing ? 'PRODUCT_SHOPIFY_RECONCILED' : 'PRODUCT_SHOPIFY_PUBLISHED', entityType: 'PRODUCT', entityId: product.id, metadata: { actorUserId, externalProductId: result.externalProductId, idempotencyKey } } });
      });
      return { ...result, alreadyPublished: false, reconciled: Boolean(existing) };
    } catch (error) {
      const failure = error instanceof ShopifyApiError ? error : new ShopifyApiError(error instanceof Error ? error.message : 'Unknown Shopify error', 'RETRYABLE');
      const attempts = product.shopifyPublishAttempts + 1;
      const retryable = failure.kind === 'RETRYABLE' || failure.kind === 'RATE_LIMITED';
      const retryAt = retryable && attempts <= RETRY_DELAYS_MS.length ? new Date(Date.now() + (failure.retryAfterMs ?? RETRY_DELAYS_MS[attempts - 1])) : null;
      await prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id: product.id }, data: { shopifyPublicationStatus: retryAt ? 'RETRY_WAIT' : 'FAILED', shopifyLastError: failure.message, shopifyNextRetryAt: retryAt } });
        await tx.auditLog.create({ data: { organizationId, action: retryAt ? 'PRODUCT_SHOPIFY_RETRY_SCHEDULED' : 'PRODUCT_SHOPIFY_PUBLISH_FAILED', entityType: 'PRODUCT', entityId: product.id, metadata: { actorUserId, attempts, kind: failure.kind, retryAt, status: failure.status } } });
      });
      throw error;
    }
  }

  async reconcileProduct(productId: string, organizationId: string) {
    const product = await prisma.product.findFirst({ where: { id: productId, organizationId, shopifyProductId: { not: null } } });
    if (!product?.shopifyProductId) return { checked: false };
    try {
      const found = await this.adapter.findProduct(product.id);
      await prisma.product.update({ where: { id: product.id }, data: { shopifyLastCheckedAt: new Date(), shopifyLastError: found ? null : 'Shopify product not found' } });
      if (!found) await prisma.auditLog.create({ data: { organizationId, action: 'PRODUCT_SHOPIFY_MISSING', entityType: 'PRODUCT', entityId: product.id, metadata: { externalProductId: product.shopifyProductId } } });
      return { checked: true, exists: Boolean(found) };
    } catch (error) {
      await prisma.product.update({ where: { id: product.id }, data: { shopifyLastCheckedAt: new Date(), shopifyLastError: error instanceof Error ? error.message : 'Reconciliation failed' } });
      throw error;
    }
  }

  async reconcileDueProducts(limit = 50) {
    const now = new Date();
    const due = await prisma.product.findMany({ where: { shopifyPublicationStatus: { in: ['RETRY_WAIT', 'PUBLISHED'] }, OR: [{ shopifyNextRetryAt: { lte: now } }, { shopifyLastCheckedAt: null }, { shopifyLastCheckedAt: { lte: new Date(Date.now() - 60 * 60_000) } }] }, take: limit });
    let processed = 0;
    for (const product of due) {
      try {
        if (product.shopifyPublicationStatus === 'RETRY_WAIT') await this.publishApprovedProduct(product.id, product.organizationId);
        else await this.reconcileProduct(product.id, product.organizationId);
        processed += 1;
      } catch (error) {
        console.error(`Shopify reconciliation failed for ${product.id}`, error);
      }
    }
    return processed;
  }
}
