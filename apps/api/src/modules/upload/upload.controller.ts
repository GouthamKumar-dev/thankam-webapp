import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('media')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return this.uploadService.mapUploadedFiles(files);
  }

  @Delete('file')
  async deleteFile(
    @Query('url') url?: string,
    @Body('url') bodyUrl?: string,
  ) {
    const target = url || bodyUrl;
    if (!target) {
      throw new BadRequestException('File URL or filename is required');
    }

    const deleted = await this.uploadService.deleteFile(target);
    return {
      success: true,
      deleted,
      message: deleted
        ? 'File deleted successfully from upload directory'
        : 'File not found, in use, or already deleted',
    };
  }

  @Post('delete')
  async postDeleteFile(
    @Body('url') bodyUrl?: string,
    @Query('url') url?: string,
  ) {
    const target = bodyUrl || url;
    if (!target) {
      throw new BadRequestException('File URL or filename is required');
    }

    const deleted = await this.uploadService.deleteFile(target);
    return {
      success: true,
      deleted,
      message: deleted
        ? 'File deleted successfully from upload directory'
        : 'File not found, in use, or already deleted',
    };
  }

  @Delete(':filename')
  async deleteByFilename(@Param('filename') filename: string) {
    if (!filename) {
      throw new BadRequestException('Filename is required');
    }

    const deleted = await this.uploadService.deleteFile(filename);
    return {
      success: true,
      deleted,
      message: deleted
        ? 'File deleted successfully from upload directory'
        : 'File not found, in use, or already deleted',
    };
  }
}
