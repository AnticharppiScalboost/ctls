import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AddressesModule } from './addresses';
import { DeepResearchModule } from './deep-research/deep-research.module';
import { VideoExtractorModule } from './video-extractor/video-extractor.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    AddressesModule,
    DeepResearchModule,
    VideoExtractorModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
