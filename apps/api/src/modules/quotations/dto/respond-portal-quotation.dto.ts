import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RespondPortalQuotationDto {
  @IsIn(['ACCEPT', 'DECLINE', 'INTERESTED'])
  action!: 'ACCEPT' | 'DECLINE' | 'INTERESTED';

  @IsOptional()
  @IsString()
  @MinLength(2)
  reason?: string;
}

