import { Module } from '@nestjs/common';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.services';
import { AddressesRepository } from './addresses.repository';
import { DatabaseModule } from '../db/db.module';
import { AddressNormalizerService } from './services/address-normalizer.service';
import { ProximitySearchService } from './services/proximity-search.service';

@Module({
  controllers: [AddressesController],
  providers: [
    AddressesService, 
    AddressesRepository, 
    AddressNormalizerService,
    ProximitySearchService
  ],
  imports: [DatabaseModule],
  exports: [ProximitySearchService, AddressNormalizerService],
})
export class AddressesModule {}
