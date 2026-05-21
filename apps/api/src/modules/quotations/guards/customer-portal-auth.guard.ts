import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

type PortalJwtPayload = {
  phone: string;
  type: 'customer_portal';
};

@Injectable()
export class CustomerPortalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & { customerPortal?: { phone: string } }
    >();
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const secret =
      this.configService.get<string>('CUSTOMER_PORTAL_JWT_SECRET') ??
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    try {
      const payload = await this.jwtService.verifyAsync<PortalJwtPayload>(token, {
        secret,
      });
      if (!payload?.phone || payload.type !== 'customer_portal') {
        throw new UnauthorizedException('Invalid token');
      }

      req.customerPortal = { phone: payload.phone };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) return null;
    return token;
  }
}

