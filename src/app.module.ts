import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AddressesModule } from './addresses';
import { DeepResearchModule } from './deep-research/deep-research.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    AddressesModule,
    DeepResearchModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
