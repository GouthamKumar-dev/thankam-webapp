import { IsString, Matches } from 'class-validator';

export class RequestCustomerOtpDto {
  @IsString()
  @Matches(/^\d{10}$/)
  phone!: string;
}
