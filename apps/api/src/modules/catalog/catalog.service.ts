import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@foxiby/database';
import type { AuthUser } from '../auth/auth.service';
import { CreateProductDto } from './create-product.dto';

const canApprove = (role: AuthUser['role']) => role === 'OWNER' || role === 'ADMIN';

@Injectable()
export class CatalogService {
  async list(organizationId: string, category?: string, search?: string) {
    const products = await prisma.product.findMany({
      where: {
        organizationId,
        ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => this.serialize(product));
  }

  async create(organizationId: string, input: CreateProductDto) {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          organizationId,
          title: input.title.trim(),
          description: input.description?.trim(),
          supplierUrl: input.supplierUrl,
          imageUrls: input.imageUrls ?? [],
          cost: input.cost,
          sellingPrice: input.sellingPrice,
          status: 'DRAFT',
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          action: 'PRODUCT_CREATED',
          entityType: 'PRODUCT',
          entityId: created.id,
          metadata: { source: 'api' },
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: 'PRODUCT_CREATED',
          aggregateType: 'PRODUCT',
          aggregateId: created.id,
          payload: { productId: created.id, organizationId },
        },
      });

      return created;
    });

    return this.serialize(product);
  }

  async approve(organizationId: string, productId: string, actor: AuthUser) {
    if (!canApprove(actor.role)) throw new ConflictException('Only owners and admins can approve products');

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: productId, organizationId } });
      if (!product) throw new NotFoundException('Product not found');
      if (product.status !== 'REVIEW') throw new ConflictException('Only products in REVIEW can be approved');

      const approved = await tx.product.update({ where: { id: product.id }, data: { status: 'APPROVED' } });
      await tx.auditLog.create({
        data: {
          organizationId,
          action: 'PRODUCT_APPROVED',
          entityType: 'PRODUCT',
          entityId: product.id,
          metadata: { actorUserId: actor.userId, role: actor.role },
        },
      });
      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: 'PRODUCT_PUBLISH_APPROVED',
          aggregateType: 'PRODUCT',
          aggregateId: product.id,
          payload: { productId: product.id, organizationId, approvedBy: actor.userId },
        },
      });
      return this.serialize(approved);
    });
  }

  async publish(organizationId: string, productId: string, actor: AuthUser) {
    if (!canApprove(actor.role)) throw new ConflictException('Only owners and admins can publish products');

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: productId, organizationId } });
      if (!product) throw new NotFoundException('Product not found');
      if (product.status !== 'APPROVED') throw new ConflictException('Only approved products can be published');

      const published = await tx.product.update({ where: { id: product.id }, data: { status: 'PUBLISHED' } });
      await tx.auditLog.create({
        data: {
          organizationId,
          action: 'PRODUCT_PUBLISHED',
          entityType: 'PRODUCT',
          entityId: product.id,
          metadata: { actorUserId: actor.userId, role: actor.role },
        },
      });
      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: 'PRODUCT_PUBLISHED',
          aggregateType: 'PRODUCT',
          aggregateId: product.id,
          payload: { productId: product.id, organizationId, publishedBy: actor.userId },
        },
      });
      return this.serialize(published);
    });
  }

  private serialize(product: { id: string; title: string; description: string | null; supplierUrl: string | null; imageUrls: unknown; cost: { toFixed: (digits: number) => string }; sellingPrice: { toFixed: (digits: number) => string }; aiScore: number | null; status: string; createdAt: Date; updatedAt: Date }) {
    const cost = Number(product.cost.toFixed(2));
    const sellingPrice = Number(product.sellingPrice.toFixed(2));
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      supplierUrl: product.supplierUrl,
      imageUrls: product.imageUrls,
      cost: cost.toFixed(2),
      sellingPrice: sellingPrice.toFixed(2),
      margin: sellingPrice > 0 ? Number((((sellingPrice - cost) / sellingPrice) * 100).toFixed(2)) : 0,
      aiScore: product.aiScore,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
