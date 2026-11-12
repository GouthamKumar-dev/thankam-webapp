import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
        include: { items: { select: { id: true } } },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }

      if (parent.items.length > 0) {
        throw new BadRequestException(
          'Cannot add subcategory. Parent category already contains items.',
        );
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        parentId: dto.parentId,
      },
    });
  }

  async findTree() {
    const categories = await this.prisma.category.findMany({
      include: {
        items: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const byParent = new Map<string | null, typeof categories>();
    for (const category of categories) {
      const key = category.parentId ?? null;
      if (!byParent.has(key)) {
        byParent.set(key, []);
      }
      byParent.get(key)?.push(category);
    }

    const build = (parentId: string | null): any[] => {
      const nodes = byParent.get(parentId) ?? [];
      return nodes.map((node) => ({
        ...node,
        children: build(node.id),
      }));
    };

    return build(null);
  }

  async findPublicTree() {
    const EXCLUDED_NON_FOOD_CATEGORIES = [
      'Stage Decoration',
      'Seating & Furniture',
      'Audio & Visual',
      'Hospitality & Service',
      'Photography & Media',
    ];

    const categories = await this.prisma.category.findMany({
      where: {
        name: { notIn: EXCLUDED_NON_FOOD_CATEGORIES },
      },
      include: {
        items: {
          where: { isActive: true },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const byParent = new Map<string | null, typeof categories>();
    for (const category of categories) {
      if (EXCLUDED_NON_FOOD_CATEGORIES.includes(category.name)) continue;
      const key = category.parentId ?? null;
      if (!byParent.has(key)) {
        byParent.set(key, []);
      }
      byParent.get(key)?.push(category);
    }

    const build = (parentId: string | null): any[] => {
      const nodes = byParent.get(parentId) ?? [];
      return nodes
        .filter((node) => !EXCLUDED_NON_FOOD_CATEGORIES.includes(node.name))
        .map((node) => ({
          ...node,
          children: build(node.id),
        }));
    };

    return build(null);
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        items: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } },
        items: { select: { id: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.children.length > 0 || category.items.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories or items',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Category not found');
    }
  }
}
