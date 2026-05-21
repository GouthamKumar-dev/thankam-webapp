import { IsString, MinLength } from 'class-validator';

export class RejectAgreementDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

