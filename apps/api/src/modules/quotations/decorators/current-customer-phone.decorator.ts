import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCustomerPhone = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{
      customerPortal?: { phone?: string };
    }>();
    return req.customerPortal?.phone ?? null;
  },
);

