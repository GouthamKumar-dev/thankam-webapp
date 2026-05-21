import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';
import { resolveUploadDirectory } from '../../common/utils/upload-path.util';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uploadDir = configService.get<string>('UPLOAD_LOCAL_DIR') ?? 'uploads';
        const destination = resolveUploadDirectory(uploadDir);

        if (!existsSync(destination)) {
          mkdirSync(destination, { recursive: true });
        }

        return {
          storage: diskStorage({
            destination,
            filename: (_req, file, cb) => {
              const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
              const ext = extname(file.originalname).toLowerCase();
              cb(null, `${unique}${ext}`);
            },
          }),
          fileFilter: (_req, file, cb) => {
            const allowedMime = /^(image|video)\//.test(file.mimetype);
            if (!allowedMime) {
              cb(null, false);
              return;
            }

            cb(null, true);
          },
          limits: {
            fileSize: 1024 * 1024 * 50,
          },
        };
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
