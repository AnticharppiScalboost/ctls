import { Module } from '@nestjs/common';
import { drizzleProvider, DrizzleAsyncProvider } from './db.provider';

@Module({
  providers: [...drizzleProvider],
  exports: [DrizzleAsyncProvider],
})
export class DatabaseModule {}
