import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtUser } from '../../common/types/jwt-user.type';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateGalleryDto, user: JwtUser) {
    return this.prisma.media.create({
      data: {
        ...dto,
        uploadedById: user.sub,
      },
    });
  }

  findAll(user: JwtUser) {
    return this.prisma.media.findMany({
      where: user.role === Role.STAFF ? { uploadedById: user.sub } : {},
      include: {
        uploadedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateGalleryDto, user: JwtUser) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (user.role === Role.STAFF && media.uploadedById !== user.sub) {
      throw new ForbiddenException('You can edit only your uploads');
    }

    return this.prisma.media.update({ where: { id }, data: dto });
  }

  async reorder(orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.media.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return { message: 'Gallery reordered' };
  }

  async remove(id: string, user: JwtUser) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (user.role === Role.STAFF && media.uploadedById !== user.sub) {
      throw new ForbiddenException('You can delete only your uploads');
    }

    await this.prisma.media.delete({ where: { id } });
    return { message: 'Media deleted' };
  }
}
