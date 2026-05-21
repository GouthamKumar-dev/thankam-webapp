import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateGalleryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

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
