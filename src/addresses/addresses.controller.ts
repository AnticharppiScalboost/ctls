import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { AddressesService } from './addresses.services';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  public async findPaginated(
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    return this.addressesService.findPaginated(page, limit);
  }
}
