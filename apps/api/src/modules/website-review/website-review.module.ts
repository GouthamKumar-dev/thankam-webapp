import { Module } from '@nestjs/common';
import { WebsiteReviewController } from './website-review.controller';
import { WebsiteReviewService } from './website-review.service';

@Module({
  controllers: [WebsiteReviewController],
  providers: [WebsiteReviewService],
  exports: [WebsiteReviewService],
})
export class WebsiteReviewModule {}
