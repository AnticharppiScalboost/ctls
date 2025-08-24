import { Controller, Get, ParseIntPipe, Query, Post, Body } from '@nestjs/common';
import { AddressesService } from './addresses.services';
import { ProximitySearchService } from './services/proximity-search.service';
import type { ProximitySearchRequest } from './dto/proximity-search.dto';

@Controller('addresses')
export class AddressesController {
  constructor(
    private readonly addressesService: AddressesService,
    private readonly proximitySearchService: ProximitySearchService,
  ) {}

  @Get()
  public async findPaginated(
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    return this.addressesService.findPaginated(page, limit);
  }

  @Post('search/proximity')
  public async searchProximity(@Body() request: ProximitySearchRequest) {
    return this.proximitySearchService.searchNearbyAddresses(request);
  }
}
