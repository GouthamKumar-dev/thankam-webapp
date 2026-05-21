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
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateWebsiteReviewDto } from './dto/create-website-review.dto';
import { ReorderWebsiteReviewDto } from './dto/reorder-website-review.dto';
import { UpdateWebsiteReviewDto } from './dto/update-website-review.dto';
import { WebsiteReviewService } from './website-review.service';

@Controller('website-review')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class WebsiteReviewController {
  constructor(private readonly websiteReviewService: WebsiteReviewService) {}

  @Post()
  create(@Body() dto: CreateWebsiteReviewDto) {
    return this.websiteReviewService.create(dto);
  }

  @Get()
  findAll() {
    return this.websiteReviewService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWebsiteReviewDto) {
    return this.websiteReviewService.update(id, dto);
  }

  @Post('reorder')
  reorder(@Body() dto: ReorderWebsiteReviewDto) {
    return this.websiteReviewService.reorder(dto.orderedIds);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.websiteReviewService.remove(id);
  }
}
