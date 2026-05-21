import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
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
}
