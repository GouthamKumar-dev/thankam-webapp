import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { deleteUploadedFile } from '../../common/utils/upload-path.util';
import { CreateWebsiteReviewDto } from './dto/create-website-review.dto';
import { UpdateWebsiteReviewDto } from './dto/update-website-review.dto';

@Injectable()
export class WebsiteReviewService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateWebsiteReviewDto) {
    return this.prisma.websiteReview.create({ data: dto });
  }

  findAll() {
    return this.prisma.websiteReview.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateWebsiteReviewDto) {
    const existing = await this.prisma.websiteReview.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Website review content not found');
    }

    const dataToUpdate: Prisma.WebsiteReviewUpdateInput = {
      ...dto,
      mediaUrl: dto.mediaUrl === '' ? null : dto.mediaUrl,
    };

    const updated = await this.prisma.websiteReview.update({
      where: { id },
      data: dataToUpdate,
    });

    if (
      existing.mediaUrl &&
      dto.mediaUrl !== undefined &&
      dto.mediaUrl !== existing.mediaUrl
    ) {
      const inUse = await this.prisma.websiteReview.count({
        where: { id: { not: id }, mediaUrl: existing.mediaUrl },
      });
      if (inUse === 0) {
        await deleteUploadedFile(existing.mediaUrl);
      }
    }

    return updated;
  }

  async reorder(orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.websiteReview.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return { message: 'Website review content reordered' };
  }

  async remove(id: string) {
    const row = await this.prisma.websiteReview.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Website review content not found');
    }

    await this.prisma.websiteReview.delete({ where: { id } });

    if (row.mediaUrl) {
      const inUse = await this.prisma.websiteReview.count({
        where: { id: { not: id }, mediaUrl: row.mediaUrl },
      });
      if (inUse === 0) {
        await deleteUploadedFile(row.mediaUrl);
      }
    }

    return { message: 'Website review content deleted' };
  }
}
