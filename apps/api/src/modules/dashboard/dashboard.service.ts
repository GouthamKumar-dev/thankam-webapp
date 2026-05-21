import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtUser } from '../../common/types/jwt-user.type';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(user: JwtUser) {
    const isAdmin = user.role === Role.ADMIN;

    const [
      totalCategories,
      totalItems,
      totalMenus,
      totalUsers,
      recentQuotations,
      recentUploads,
    ] = await Promise.all([
      isAdmin ? this.prisma.category.count() : Promise.resolve(0),
      isAdmin ? this.prisma.item.count() : Promise.resolve(0),
      isAdmin ? this.prisma.menu.count() : Promise.resolve(0),
      isAdmin ? this.prisma.user.count() : Promise.resolve(0),
      isAdmin
        ? this.prisma.quotation.findMany({
            where: { isDeleted: false },
            take: 5,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      this.prisma.media.findMany({
        where: isAdmin ? {} : { uploadedById: user.sub },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      cards: {
        totalCategories,
        totalItems,
        totalMenus,
        totalUsers,
      },
      recentQuotations,
      recentUploads,
    };
  }
}
