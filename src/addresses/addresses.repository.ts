import { Inject, Injectable } from '@nestjs/common';
import { count } from 'drizzle-orm';
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

    const [data, totalResult] = await Promise.all([
      this.db.select().from(addresses).limit(limit).offset(offset),
      this.db.select({ count: count() }).from(addresses),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return { data, total, page, limit };
  }
}
