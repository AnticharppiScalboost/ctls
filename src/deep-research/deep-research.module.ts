import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../redis/redis.module';
import { PerplexityService } from './services/perplexity.service';
import { ResearchQueueService } from './services/research-queue.service';
import { ResearchProcessor } from './processors/research.processor';
import { DeepResearchController } from './deep-research.controller';
import { DEEP_RESEARCH_QUEUE } from './constants/queue.constants';
import perplexityConfig from '../config/perplexity.config';

@Module({
  imports: [
    ConfigModule.forFeature(perplexityConfig),
    RedisModule,
    HttpModule.register({
      timeout: 60000, // 60 segundos timeout para HTTP requests
      maxRedirects: 5,
    }),
    BullModule.registerQueue({
      name: DEEP_RESEARCH_QUEUE,
    }),
  ],
  controllers: [DeepResearchController],
  providers: [
    PerplexityService,
    ResearchQueueService,
    ResearchProcessor,
  ],
  exports: [
    PerplexityService,
    ResearchQueueService,
  ],
})
export class DeepResearchModule {}
