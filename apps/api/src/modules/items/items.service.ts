import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toSkipTake } from '../../common/dto/pagination.util';
import { ItemQueryDto } from './dto/item-query.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateItemDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      include: { children: { select: { id: true } } },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.children.length > 0) {
      throw new BadRequestException(
        'Cannot add item to category containing subcategories',
      );
    }

    return this.prisma.item.create({
      data: {
        name: dto.name,
        description: dto.description,
        basePrice: dto.basePrice ?? 0,
        unit: dto.unit,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(query: ItemQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const { skip, take } = toSkipTake(page, limit);

    const term = (query.search ?? query.q ?? '').trim();
    const category = (query.category ?? '').trim();
    const categoryId = query.categoryId?.trim();

    const where: Prisma.ItemWhereInput = {
      isActive: true,
    };

    if (term) {
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { category: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    } else if (category && category !== 'All Categories') {
      where.category = {
        name: { equals: category, mode: 'insensitive' },
      };
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where,
        skip,
        take,
        include: { category: true },
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.item.count({ where }),
    ]);

    return {
      data: rows,
      meta: { page, limit, total },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return item;
  }

  async update(id: string, dto: UpdateItemDto) {
    const existing = await this.prisma.item.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Item not found');
    }

    return this.prisma.item.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.item.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Item not found');
    }

    await this.prisma.item.delete({ where: { id } });
    return { message: 'Item deleted' };
  }
}
