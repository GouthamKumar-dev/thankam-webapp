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
      totalQuotations,
      pipelineSum,
      acceptedCount,
      acceptedSum,
      pendingRequestsCount,
      recentQuotations,
      recentRequests,
      upcomingEvents,
      recentUploads,
    ] = await Promise.all([
      isAdmin ? this.prisma.category.count() : Promise.resolve(0),
      isAdmin ? this.prisma.item.count() : Promise.resolve(0),
      isAdmin ? this.prisma.menu.count() : Promise.resolve(0),
      isAdmin ? this.prisma.user.count() : Promise.resolve(0),
      isAdmin
        ? this.prisma.quotation.count({ where: { isDeleted: false } })
        : Promise.resolve(0),
      isAdmin
        ? this.prisma.quotation.aggregate({
            where: { isDeleted: false },
            _sum: { grandTotal: true },
          })
        : Promise.resolve({ _sum: { grandTotal: null } }),
      isAdmin
        ? this.prisma.quotation.count({
            where: { isDeleted: false, agreementStatus: 'ACCEPTED' },
          })
        : Promise.resolve(0),
      isAdmin
        ? this.prisma.quotation.aggregate({
            where: { isDeleted: false, agreementStatus: 'ACCEPTED' },
            _sum: { grandTotal: true },
          })
        : Promise.resolve({ _sum: { grandTotal: null } }),
      isAdmin
        ? this.prisma.quotation.count({
            where: {
              isDeleted: false,
              source: 'CUSTOMER_PORTAL',
              requestStatus: { in: ['NEW', 'OTP_VERIFIED', 'CONTACTED'] },
            },
          })
        : Promise.resolve(0),
      isAdmin
        ? this.prisma.quotation.findMany({
            where: { isDeleted: false },
            take: 6,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              quotationNumber: true,
              customerName: true,
              customerPhone: true,
              eventDate: true,
              eventType: true,
              grandTotal: true,
              status: true,
              agreementStatus: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      isAdmin
        ? this.prisma.quotation.findMany({
            where: { isDeleted: false, source: 'CUSTOMER_PORTAL' },
            take: 6,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              quotationNumber: true,
              customerName: true,
              customerPhone: true,
              eventType: true,
              guestCount: true,
              createdAt: true,
              requestStatus: true,
              grandTotal: true,
            },
          })
        : Promise.resolve([]),
      isAdmin
        ? this.prisma.quotation.findMany({
            where: {
              isDeleted: false,
              eventDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
            take: 6,
            orderBy: { eventDate: 'asc' },
            select: {
              id: true,
              quotationNumber: true,
              customerName: true,
              customerPhone: true,
              eventDate: true,
              eventType: true,
              venue: true,
              guestCount: true,
              grandTotal: true,
              status: true,
              agreementStatus: true,
            },
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
        totalQuotations,
        pipelineValue: Number(pipelineSum._sum.grandTotal ?? 0),
        acceptedCount,
        acceptedValue: Number(acceptedSum._sum.grandTotal ?? 0),
        pendingRequestsCount,
      },
      upcomingEvents,
      recentRequests,
      recentQuotations,
      recentUploads,
    };
  }
}
