import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMenuDto) {
    await this.validateItems(dto.itemIds);

    return this.prisma.menu.create({
      data: {
        name: dto.name,
        description: dto.description,
        menuItems: {
          create: dto.itemIds.map((itemId, index) => ({
            itemId,
            sortOrder: index,
          })),
        },
      },
      include: {
        menuItems: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  findAll() {
    return this.prisma.menu.findMany({
      include: {
        menuItems: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        menuItems: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    return menu;
  }

  async update(id: string, dto: UpdateMenuDto) {
    await this.ensureExists(id);

    if (dto.itemIds) {
      await this.validateItems(dto.itemIds);

      await this.prisma.menuItem.deleteMany({ where: { menuId: id } });
      await this.prisma.menuItem.createMany({
        data: dto.itemIds.map((itemId, index) => ({
          menuId: id,
          itemId,
          sortOrder: index,
        })),
      });
    }

    return this.prisma.menu.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        menuItems: { include: { item: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async duplicate(id: string) {
    const menu = await this.findOne(id);
    return this.create({
      name: `${menu.name} Copy`,
      description: menu.description ?? undefined,
      itemIds: menu.menuItems.map((mi) => mi.itemId),
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.menu.delete({ where: { id } });
    return { message: 'Menu deleted' };
  }

  private async ensureExists(id: string) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }
  }

  private async validateItems(itemIds: string[]) {
    const unique = Array.from(new Set(itemIds));
    if (unique.length !== itemIds.length) {
      throw new BadRequestException('Duplicate items are not allowed in menu');
    }

    const count = await this.prisma.item.count({ where: { id: { in: unique } } });
    if (count !== unique.length) {
      throw new BadRequestException('One or more items are invalid');
    }
  }
}
