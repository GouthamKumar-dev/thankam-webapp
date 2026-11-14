import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class RequestCustomerOtpDto {
  @IsString()
  @Matches(/^\d{10}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  @IsIn(['11', '12', 'SMS', 'WHATSAPP'])
  channel?: string;
}
