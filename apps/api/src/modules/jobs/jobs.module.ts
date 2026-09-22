import { Module } from '@nestjs/common';
import { AiScoringService } from './ai-scoring.service';
import { EventConsumerService } from './event-consumer.service';

@Module({
  providers: [AiScoringService, EventConsumerService],
  exports: [AiScoringService, EventConsumerService],
})
export class JobsModule {}
