import { PartialType } from '@nestjs/mapped-types';
import { CreateWebsiteReviewDto } from './create-website-review.dto';

export class UpdateWebsiteReviewDto extends PartialType(CreateWebsiteReviewDto) {}
