import { IsString } from 'class-validator';

export class CreateSelfieDto {
  @IsString()
  customerName!: string;
}
