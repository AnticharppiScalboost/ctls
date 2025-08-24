import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { VideoExtractorController } from './video-extractor.controller';
import { VideoExtractorService } from './services/video-extractor.service';
import { VideoQueueService } from './services/video-queue.service';
import { VideoExtractionProcessor } from './processors/video-extraction.processor';
import { VIDEO_EXTRACTOR_QUEUE } from './constants/video-extractor.constants';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // 60 segundos timeout por defecto
      maxRedirects: 5,
    }),
    BullModule.registerQueue({
      name: VIDEO_EXTRACTOR_QUEUE,
    }),
    RedisModule,
  ],
  controllers: [VideoExtractorController],
  providers: [
    VideoExtractorService,
    VideoQueueService,
    VideoExtractionProcessor,
  ],
  exports: [VideoExtractorService, VideoQueueService],
})
export class VideoExtractorModule {}
