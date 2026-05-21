import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';
import { resolveUploadDirectory } from '../../common/utils/upload-path.util';
import { UploadModule } from '../upload/upload.module';
import { CustomerPortalAuthGuard } from '../quotations/guards/customer-portal-auth.guard';
import { EventMediaController } from './event-media.controller';
import { EventMediaService } from './event-media.service';

@Module({
  imports: [
    /* JwtService is required by CustomerPortalAuthGuard */
    JwtModule.register({}),
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => {
        const uploadDir = cs.get<string>('UPLOAD_LOCAL_DIR') ?? 'uploads';
        const destination = resolveUploadDirectory(uploadDir);
        if (!existsSync(destination)) mkdirSync(destination, { recursive: true });
        return {
          storage: diskStorage({
            destination,
            filename: (_req, file, cb) => {
              const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
              cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
            },
          }),
          limits: { fileSize: 1024 * 1024 * 20 },
        };
      },
    }),
    UploadModule,
  ],
  controllers: [EventMediaController],
  providers: [EventMediaService, CustomerPortalAuthGuard],
})
export class EventMediaModule {}
