import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class VerifyCustomerOtpDto {
  @IsString()
  @Matches(/^\d{10}$/)
  phone!: string;

  @IsString()
  @Length(4, 8)
  otp!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Matches(/^[A-Za-z\s]+$/)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
