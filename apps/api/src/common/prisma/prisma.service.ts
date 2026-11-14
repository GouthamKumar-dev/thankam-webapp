import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    try {
      await this.$executeRawUnsafe(
        `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;`,
      );
      this.logger.log('Database schema verified: Quotation.customerEmail column is ready.');
    } catch (err) {
      this.logger.warn(`Could not auto-apply Quotation.customerEmail column: ${err}`);
    }
  }
}
