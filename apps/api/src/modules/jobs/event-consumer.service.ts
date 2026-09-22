import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@foxiby/database';
import { AiScoringService } from './ai-scoring.service';
import { ShopifyPublishingService } from '../shopify/shopify-publishing.service';
import {
  FOXIBY_EVENTS_QUEUE,
  PRODUCT_AI_SCORING_REQUESTED,
  PRODUCT_CREATED,
  PRODUCT_PUBLISH_APPROVED,
  PRODUCT_PUBLISHED,
  PRODUCT_SCORING_QUEUE,
  type ProductCreatedPayload,
  type ProductScoringPayload,
  type ProductWorkflowPayload,
} from './job-types';

@Injectable()
export class EventConsumerService implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly scoringQueue: Queue;
  private readonly eventWorker: Worker;
  private readonly scoringWorker: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly aiScoring: AiScoringService,
    private readonly shopify: ShopifyPublishingService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const concurrency = Number(this.config.get('WORKER_CONCURRENCY', 5));
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.scoringQueue = new Queue(PRODUCT_SCORING_QUEUE, { connection: this.connection });
    this.eventWorker = new Worker(FOXIBY_EVENTS_QUEUE, (job) => this.handleEvent(job), { connection: this.connection, concurrency });
    this.scoringWorker = new Worker(PRODUCT_SCORING_QUEUE, (job) => this.handleScoring(job), { connection: this.connection, concurrency });
  }

  private async handleEvent(job: Job): Promise<void> {
    const execution = await this.claimExecution(job, job.name);
    if (!execution) return;
    try {
      if (job.name === PRODUCT_CREATED) {
        const payload = this.parseProductPayload(job.data);
        await this.scoringQueue.add(PRODUCT_AI_SCORING_REQUESTED, payload, { jobId: `score:${payload.productId}`, removeOnComplete: 1000, removeOnFail: 5000 });
      } else if (job.name === PRODUCT_PUBLISHED) {
        const payload = this.parseProductPayload(job.data) as ProductWorkflowPayload;
        await this.shopify.publishApprovedProduct(payload.productId, payload.organizationId, payload.publishedBy);
      } else if (job.name === PRODUCT_PUBLISH_APPROVED) {
        this.parseProductPayload(job.data);
      } else {
        throw new Error(`Unsupported event type: ${job.name}`);
      }
      await this.completeExecution(execution.id, { handled: true });
    } catch (error) {
      await this.failExecution(execution.id, error);
      throw error;
    }
  }

  private async handleScoring(job: Job): Promise<void> {
    const execution = await this.claimExecution(job, PRODUCT_AI_SCORING_REQUESTED);
    if (!execution) return;
    try {
      const payload = this.parseProductPayload(job.data);
      const result = await this.aiScoring.scoreProduct(payload.productId);
      await prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id: payload.productId }, data: { aiScore: result.score, status: 'REVIEW' } });
        await tx.auditLog.create({ data: { organizationId: payload.organizationId, action: 'PRODUCT_AI_SCORED', entityType: 'PRODUCT', entityId: payload.productId, metadata: result } });
      });
      await this.completeExecution(execution.id, result);
    } catch (error) {
      await this.failExecution(execution.id, error);
      throw error;
    }
  }

  private async claimExecution(job: Job, eventType: string) {
    const jobId = job.id ?? `${eventType}:${job.name}`;
    const existing = await prisma.jobExecution.findUnique({ where: { jobId } });
    if (existing?.status === 'COMPLETED') return null;
    if (existing) return prisma.jobExecution.update({ where: { id: existing.id }, data: { status: 'PROCESSING', attempts: { increment: 1 }, lastError: null } });
    return prisma.jobExecution.create({ data: { jobId, eventType } });
  }

  private async completeExecution(id: string, result: object) {
    await prisma.jobExecution.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date(), result } });
  }

  private async failExecution(id: string, error: unknown) {
    await prisma.jobExecution.update({ where: { id }, data: { status: 'FAILED', lastError: error instanceof Error ? error.message : 'Unknown worker error' } });
  }

  private parseProductPayload(value: unknown): ProductCreatedPayload | ProductScoringPayload | ProductWorkflowPayload {
    if (!value || typeof value !== 'object' || !('productId' in value) || !('organizationId' in value)) throw new Error('Invalid product job payload');
    const payload = value as Record<string, unknown>;
    if (typeof payload.productId !== 'string' || typeof payload.organizationId !== 'string') throw new Error('Invalid product job payload');
    return { productId: payload.productId, organizationId: payload.organizationId, ...(typeof payload.approvedBy === 'string' ? { approvedBy: payload.approvedBy } : {}), ...(typeof payload.publishedBy === 'string' ? { publishedBy: payload.publishedBy } : {}) };
  }

  async onModuleDestroy() {
    await this.eventWorker.close();
    await this.scoringWorker.close();
    await this.scoringQueue.close();
    await this.connection.quit();
  }
}
