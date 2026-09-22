import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@foxiby/database';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class OutboxService implements OnModuleDestroy {
  private readonly queue: Queue;
  private readonly connection: IORedis;

  constructor(private readonly config: ConfigService) {
    this.connection = new IORedis(this.config.get<string>('REDIS_URL', 'redis://localhost:6379'), { maxRetriesPerRequest: null });
    this.queue = new Queue('foxiby-events', { connection: this.connection });
  }

  async publishPending(limit = 50): Promise<number> {
    const events = await prisma.outboxEvent.findMany({
      where: { status: { in: ['PENDING', 'FAILED'] }, availableAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let published = 0;
    for (const event of events) {
      const claimed = await prisma.outboxEvent.updateMany({
        where: { id: event.id, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'PROCESSING', lockedAt: new Date(), attempts: { increment: 1 } },
      });
      if (claimed.count !== 1) continue;

      try {
        await this.queue.add(event.eventType, event.payload as Record<string, unknown>, { jobId: `outbox:${event.id}`, removeOnComplete: 1000, removeOnFail: 5000 });
        await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'PUBLISHED', publishedAt: new Date(), lastError: null } });
        published += 1;
      } catch (error) {
        await prisma.outboxEvent.update({ where: { id: event.id }, data: { status: 'FAILED', lastError: error instanceof Error ? error.message : 'Unknown publish error', availableAt: new Date(Date.now() + 60_000) } });
      }
    }
    return published;
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}
