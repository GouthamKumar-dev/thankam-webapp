import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CustomerPortalAuthGuard } from '../quotations/guards/customer-portal-auth.guard';
import { CurrentCustomerPhone } from '../quotations/decorators/current-customer-phone.decorator';
import { UploadService } from '../upload/upload.service';
import { EventMediaService } from './event-media.service';

@Controller()
export class EventMediaController {
  constructor(
    private readonly eventMediaService: EventMediaService,
    private readonly uploadService: UploadService,
  ) {}

  /* ── Customer: Submit Selfie ────────────────────────────────── */

  @Post('portal/event/selfie')
  @UseGuards(CustomerPortalAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async submitSelfie(
    @CurrentCustomerPhone() phone: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('customerName') customerName: string,
  ) {
    if (!file) throw new BadRequestException('Image is required');
    if (!customerName?.trim()) throw new BadRequestException('Name is required');
    const [uploaded] = this.uploadService.mapUploadedFiles([file]);
    return this.eventMediaService.createSelfie({
      customerName: customerName.trim(),
      phone,
      imageUrl: uploaded.url,
    });
  }

  /* ── Customer: Submit Review ────────────────────────────────── */

  @Post('portal/event/review')
  @UseGuards(CustomerPortalAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async submitReview(
    @CurrentCustomerPhone() phone: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('customerName') customerName: string,
    @Body('reviewText') reviewText: string,
    @Body('rating') rating: string,
  ) {
    if (!customerName?.trim()) throw new BadRequestException('Name is required');
    if (!reviewText?.trim()) throw new BadRequestException('Review text is required');

    let imageUrl: string | undefined;
    if (file) {
      const [uploaded] = this.uploadService.mapUploadedFiles([file]);
      imageUrl = uploaded.url;
    }

    return this.eventMediaService.createReview({
      customerName: customerName.trim(),
      phone,
      reviewText: reviewText.trim(),
      rating: Math.min(5, Math.max(1, parseInt(rating, 10) || 5)),
      imageUrl,
    });
  }

  /* ── Admin: Selfies ─────────────────────────────────────────── */

  @Get('admin/event/selfies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getSelfies() {
    return this.eventMediaService.findAllSelfies();
  }

  @Patch('admin/event/selfies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateSelfie(@Param('id') id: string, @Body() body: any) {
    return this.eventMediaService.updateSelfie(id, body);
  }

  @Delete('admin/event/selfies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  deleteSelfie(@Param('id') id: string) {
    return this.eventMediaService.removeSelfie(id);
  }

  /* ── Admin: Reviews ─────────────────────────────────────────── */

  @Get('admin/event/reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getReviews() {
    return this.eventMediaService.findAllReviews();
  }

  @Patch('admin/event/reviews/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateReview(@Param('id') id: string, @Body() body: any) {
    return this.eventMediaService.updateReview(id, body);
  }

  @Delete('admin/event/reviews/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  deleteReview(@Param('id') id: string) {
    return this.eventMediaService.removeReview(id);
  }
}
