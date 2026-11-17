import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  deleteUploadedFile,
  extractUploadFilename,
} from '../../common/utils/upload-path.util';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly prisma: PrismaService) {}

  mapUploadedFiles(files: Express.Multer.File[]) {
    return files.map((file) => {
      const isAllowed = /(image|video)\//.test(file.mimetype);
      if (!isAllowed) {
        throw new BadRequestException(
          `Unsupported file type for ${file.originalname}`,
        );
      }

      return {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        filename: file.filename,
        path: file.path,
        url: `/uploads/${file.filename}`,
      };
    });
  }

  /**
   * Checks whether the given filename is currently referenced by any active entity in the database.
   */
  async isFileInUse(filename: string): Promise<boolean> {
    try {
      const [mediaCount, itemCount, categoryCount, reviewCount] =
        await Promise.all([
          this.prisma.media.count({
            where: {
              OR: [
                { url: { contains: filename } },
                { thumbnailUrl: { contains: filename } },
              ],
            },
          }),
          this.prisma.item.count({
            where: { imageUrl: { contains: filename } },
          }),
          this.prisma.category.count({
            where: { imageUrl: { contains: filename } },
          }),
          this.prisma.websiteReview.count({
            where: { mediaUrl: { contains: filename } },
          }),
        ]);

      return mediaCount + itemCount + categoryCount + reviewCount > 0;
    } catch (err) {
      this.logger.warn(`Error checking if file is in use (${filename}):`, err);
      return false;
    }
  }

  /**
   * Deletes a file from the uploads directory.
   * If ignoreInUseCheck is false (default), verifies the file is not still in use by other DB records.
   */
  async deleteFile(
    fileUrlOrName: string,
    ignoreInUseCheck = false,
  ): Promise<boolean> {
    const filename = extractUploadFilename(fileUrlOrName);
    if (!filename) {
      return false;
    }

    if (!ignoreInUseCheck) {
      const inUse = await this.isFileInUse(filename);
      if (inUse) {
        this.logger.debug(
          `Skipping deletion of file "${filename}" because it is still in use by other records.`,
        );
        return false;
      }
    }

    const deleted = await deleteUploadedFile(filename);
    if (deleted) {
      this.logger.log(`Successfully removed file from upload folder: ${filename}`);
    }
    return deleted;
  }
}

