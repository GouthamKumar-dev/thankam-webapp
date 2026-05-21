import { IsObject, IsString } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  key!: string;

  @IsObject()
  value!: Record<string, unknown>;
}
