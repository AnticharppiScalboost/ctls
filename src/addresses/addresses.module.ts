import { Module } from '@nestjs/common';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.services';
import { AddressesRepository } from './addresses.repository';
import { DatabaseModule } from '../db/db.module';

@Module({
  controllers: [AddressesController],
  providers: [AddressesService, AddressesRepository],
  imports: [DatabaseModule],
})
export class AddressesModule {}
