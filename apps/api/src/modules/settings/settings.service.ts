import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  async findOne(key: string) {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    if (!row) {
      throw new NotFoundException('Setting not found');
    }

    return row;
  }

  upsert(key: string, value: Record<string, unknown>) {
    const jsonValue = value as Prisma.InputJsonValue;

    return this.prisma.setting.upsert({
      where: { key },
      update: { value: jsonValue },
      create: { key, value: jsonValue },
    });
  }
}
