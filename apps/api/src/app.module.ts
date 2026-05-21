import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ItemsModule } from './modules/items/items.module';
import { MenusModule } from './modules/menus/menus.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { GalleryModule } from './modules/gallery/gallery.module';
import { WebsiteReviewModule } from './modules/website-review/website-review.module';
import { EventMediaModule } from './modules/event-media/event-media.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UploadModule } from './modules/upload/upload.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ItemsModule,
    MenusModule,
    QuotationsModule,
    GalleryModule,
    WebsiteReviewModule,
    EventMediaModule,
    SettingsModule,
    UploadModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
