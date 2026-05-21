import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  Matches,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Matches(/^[A-Za-z\s]+$/)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @Matches(/^\d{10}$/)
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @Type(() => String)
  @IsEnum(Role)
  role!: Role;
}
