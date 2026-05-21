import { IsArray, IsUUID } from 'class-validator';

export class ReorderWebsiteReviewDto {
  @IsArray()
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}
