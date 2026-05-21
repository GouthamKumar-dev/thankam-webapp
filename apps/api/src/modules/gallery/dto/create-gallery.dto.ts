import { MediaType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateGalleryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MediaType)
  type!: MediaType;

  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsBoolean()
  isWebsiteGallery?: boolean;

  @IsOptional()
  @IsBoolean()
  isSocialContent?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
