import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z\s]+$/)
  name?: string;

  @IsOptional()
  @Matches(/^\d{10}$/)
  phone?: string;
}
