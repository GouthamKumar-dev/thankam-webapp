import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
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
    await this.ensureExists(id);
    return this.prisma.websiteReview.update({ where: { id }, data: dto });
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
    await this.ensureExists(id);
    await this.prisma.websiteReview.delete({ where: { id } });
    return { message: 'Website review content deleted' };
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.websiteReview.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Website review content not found');
    }
  }
}
