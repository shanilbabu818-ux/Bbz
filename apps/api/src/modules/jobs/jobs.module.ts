import { Module } from '@nestjs/common';
import { AiScoringService } from './ai-scoring.service';
import { EventConsumerService } from './event-consumer.service';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [ShopifyModule],
  providers: [AiScoringService, EventConsumerService],
  exports: [AiScoringService, EventConsumerService],
})
export class JobsModule {}
