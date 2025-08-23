import { BadRequestException, Injectable } from '@nestjs/common';
import { AddressesRepository } from './addresses.repository';

@Injectable()
export class AddressesService {
  constructor(private readonly addressesRepository: AddressesRepository) {}

  public async findPaginated(page: number, limit: number) {
    if (limit > 100)
      throw new BadRequestException('Limit must be less than 100');
    if (page < 1) throw new BadRequestException('Page must be greater than 0');

    return this.addressesRepository.findPaginated(page, limit);
  }
}
