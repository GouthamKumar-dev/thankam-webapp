import { IsArray, IsUUID } from 'class-validator';

export class ReorderGalleryDto {
  @IsArray()
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}
