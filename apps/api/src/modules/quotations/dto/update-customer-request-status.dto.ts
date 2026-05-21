import { IsIn } from 'class-validator';

export class UpdateCustomerRequestStatusDto {
  @IsIn([
    'REQUESTED',
    'UNDER_REVIEW',
    'QUOTED',
    'ACCEPTED',
    'DECLINED',
    'NEW',
    'OTP_VERIFIED',
    'CONTACTED',
    'CONVERTED',
    'CLOSED_REJECTED',
  ])
  requestStatus!: string;
}
