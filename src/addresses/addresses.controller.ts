import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { AddressesService } from './addresses.services';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  public async findPaginated(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.addressesService.findPaginated(page, limit);
  }
}
