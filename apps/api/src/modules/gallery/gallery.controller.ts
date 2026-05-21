import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/types/jwt-user.type';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { ReorderGalleryDto } from './dto/reorder-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { GalleryService } from './gallery.service';

@Controller('gallery')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  create(@Body() dto: CreateGalleryDto, @CurrentUser() user: JwtUser) {
    return this.galleryService.create(dto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.STAFF)
  findAll(@CurrentUser() user: JwtUser) {
    return this.galleryService.findAll(user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGalleryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.galleryService.update(id, dto, user);
  }

  @Post('reorder')
  @Roles(Role.ADMIN)
  reorder(@Body() dto: ReorderGalleryDto) {
    return this.galleryService.reorder(dto.orderedIds);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.galleryService.remove(id, user);
  }
}
