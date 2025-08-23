import { Inject, Injectable } from '@nestjs/common';
import type { Database } from '../db';
import { addresses } from '../db/schema';
import { DrizzleAsyncProvider } from '../db/db.provider';

@Injectable()
export class AddressesRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private readonly db: Database,
  ) {}

  public async findPaginated(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const [data, total] = await this.db
      .select()
      .from(addresses)
      .limit(limit)
      .offset(offset);

    return { data, total };
  }
}
