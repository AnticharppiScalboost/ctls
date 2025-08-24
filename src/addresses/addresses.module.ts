import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.services';
import { AddressesRepository } from './addresses.repository';
import { DatabaseModule } from '../db/db.module';
import { AddressNormalizerService } from './services/address-normalizer.service';
import { ProximitySearchService } from './services/proximity-search.service';
import { EmbeddingService } from './services/embedding.service';
import { PineconeService } from './services/pinecone.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { VectorMigrationService } from './services/vector-migration.service';

@Module({
  controllers: [AddressesController],
  providers: [
    AddressesService, 
    AddressesRepository, 
    AddressNormalizerService,
    ProximitySearchService,
    EmbeddingService,
    PineconeService,
    SemanticSearchService,
    VectorMigrationService,
  ],
  imports: [DatabaseModule, ConfigModule],
  exports: [
    ProximitySearchService, 
    AddressNormalizerService,
    SemanticSearchService,
    VectorMigrationService,
  ],
})
export class AddressesModule {}
