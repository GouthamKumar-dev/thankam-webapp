import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CustomerRequestQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn([
    'REQUESTED',
    'UNDER_REVIEW',
    'QUOTED',
    'ACCEPTED',
    'DECLINED',
    'CONTACTED',
    'NEW',
    'OTP_VERIFIED',
    'CONVERTED',
    'CLOSED_REJECTED',
  ])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
