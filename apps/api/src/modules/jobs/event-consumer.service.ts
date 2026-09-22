import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@foxiby/database';
import { AiScoringService } from './ai-scoring.service';
import { FOXIBY_EVENTS_QUEUE, PRODUCT_AI_SCORING_REQUESTED, PRODUCT_CREATED, PRODUCT_SCORING_QUEUE, type ProductCreatedPayload } from './job-types';

@Injectable()
export class EventConsumerService implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly worker: Worker;
  private readonly scoringQueue: import('bullmq').Queue;

  constructor(private readonly config: ConfigService, private readonly aiScoring: AiScoringService) {
    this.connection = new IORedis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'), { maxRetriesPerRequest: null });
    this.scoringQueue = new (require('bullmq').Queue)(PRODUCT_SCORING_QUEUE, { connection: this.connection });
    this.worker = new Worker(FOXIBY_EVENTS_QUEUE, async (job) => this.handle(job), { connection: this.connection, concurrency: Number(this.config.get('WORKER_CONCURRENCY', 5)) });
  }

  private async handle(job: Job): Promise<void> {
    const existing = await prisma.jobExecution.findUnique({ where: { jobId: job.id ?? String(job.name) } });
    if (existing?.status === 'COMPLETED') return;

    const execution = existing ?? await prisma.jobExecution.create({ data: { jobId: job.id ?? String(job.name), eventType: job.name } });
    try {
      if (job.name === PRODUCT_CREATED) {
        const payload = job.data as ProductCreatedPayload;
        await this.scoringQueue.add(PRODUCT_AI_SCORING_REQUESTED, payload, { jobId: `score:${payload.productId}`, removeOnComplete: 1000, removeOnFail: 5000 });
      } else {
        throw new Error(`Unsupported event type: ${job.name}`);
      }
      await prisma.jobExecution.update({ where: { id: execution.id }, data: { status: 'COMPLETED', completedAt: new Date(), result: { queued: true } } });
    } catch (error) {
      await prisma.jobExecution.update({ where: { id: execution.id }, data: { status: 'FAILED', lastError: error instanceof Error ? error.message : 'Unknown worker error' } });
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.scoringQueue.close();
    await this.connection.quit();
  }
}
