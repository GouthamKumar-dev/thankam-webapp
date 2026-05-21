import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EventMediaService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── Selfies ──────────────────────────────────────────────── */

  createSelfie(data: { customerName: string; phone: string; imageUrl: string }) {
    return this.prisma.eventSelfie.create({ data });
  }

  findAllSelfies() {
    return this.prisma.eventSelfie.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateSelfie(
    id: string,
    data: Partial<{ isApproved: boolean; isFeatured: boolean; adminNote: string }>,
  ) {
    await this.ensureSelfie(id);
    return this.prisma.eventSelfie.update({ where: { id }, data });
  }

  async removeSelfie(id: string) {
    await this.ensureSelfie(id);
    return this.prisma.eventSelfie.delete({ where: { id } });
  }

  private async ensureSelfie(id: string) {
    const row = await this.prisma.eventSelfie.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Selfie not found');
    return row;
  }

  /* ── Reviews ──────────────────────────────────────────────── */

  createReview(data: {
    customerName: string;
    phone: string;
    reviewText: string;
    rating: number;
    imageUrl?: string;
  }) {
    return this.prisma.eventReview.create({ data });
  }

  findAllReviews() {
    return this.prisma.eventReview.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateReview(
    id: string,
    data: Partial<{ isApproved: boolean; isFeatured: boolean; adminNote: string }>,
  ) {
    await this.ensureReview(id);
    return this.prisma.eventReview.update({ where: { id }, data });
  }

  async removeReview(id: string) {
    await this.ensureReview(id);
    return this.prisma.eventReview.delete({ where: { id } });
  }

  private async ensureReview(id: string) {
    const row = await this.prisma.eventReview.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Review not found');
    return row;
  }
}
