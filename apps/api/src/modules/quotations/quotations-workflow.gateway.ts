import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type AdminJwtPayload = {
  sub: string;
  role?: Role;
};

type PortalJwtPayload = {
  phone: string;
  type: 'customer_portal';
};

@Injectable()
@WebSocketGateway({
  namespace: '/workflow',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class QuotationsWorkflowGateway implements OnGatewayConnection {
  private readonly logger = new Logger(QuotationsWorkflowGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      this.extractBearer(client.handshake.headers.authorization);
    if (!token) {
      client.disconnect(true);
      return;
    }

    const portalPayload = await this.verifyPortalToken(token);
    if (portalPayload?.phone) {
      const room = this.customerRoom(this.normalizePhone(portalPayload.phone));
      await client.join(room);
      client.emit('workflow:connected', { role: 'customer', room });
      return;
    }

    const adminPayload = await this.verifyAdminToken(token);
    if (adminPayload?.sub && adminPayload?.role) {
      const isTeamMember =
        adminPayload.role === Role.ADMIN || adminPayload.role === Role.STAFF;
      if (!isTeamMember) {
        client.disconnect(true);
        return;
      }
      await client.join('admin');
      client.emit('workflow:connected', { role: 'admin', room: 'admin' });
      return;
    }

    client.disconnect(true);
  }

  @SubscribeMessage('workflow:subscribeQuotation')
  async subscribeQuotation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { quotationId?: string },
  ) {
    if (!body?.quotationId) return;
    const room = this.quotationRoom(body.quotationId);
    await client.join(room);
    client.emit('workflow:subscribed', { quotationId: body.quotationId });
  }

  emitRequestCreated(payload: {
    quotationId: string;
    quotationNumber: string;
    customerPhone: string;
    requestStatus?: string | null;
  }) {
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:request.created', eventPayload);
    this.server
      .to(this.customerRoom(customerPhone))
      .emit('workflow:request.created', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:request.created', eventPayload);
  }

  emitRequestUpdated(payload: {
    quotationId: string;
    quotationNumber: string;
    customerPhone: string;
    requestStatus?: string | null;
  }) {
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:request.updated', eventPayload);
    this.server
      .to(this.customerRoom(customerPhone))
      .emit('workflow:request.updated', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:request.updated', eventPayload);
  }

  emitRequestStatusUpdated(payload: {
    quotationId: string;
    quotationNumber: string;
    customerPhone: string;
    requestStatus: string;
  }) {
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    // Notify customer + quotation room + admin
    this.server
      .to(this.customerRoom(customerPhone))
      .emit('workflow:request.status', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:request.status', eventPayload);
    this.server.to('admin').emit('workflow:request.status', eventPayload);
  }

  emitQuotationStatusUpdated(payload: {
    quotationId: string;
    quotationNumber: string;
    customerPhone: string;
    status: string;
  }) {
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:quotation.status', eventPayload);
    this.server
      .to(this.customerRoom(customerPhone))
      .emit('workflow:quotation.status', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:quotation.status', eventPayload);
  }

  emitAgreementInitiated(payload: {
    quotationId: string;
    quotationNumber: string;
    customerPhone: string;
  }) {
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:agreement.initiated', eventPayload);
    this.server
      .to(this.customerRoom(customerPhone))
      .emit('workflow:agreement.initiated', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:agreement.initiated', eventPayload);
  }

  emitCustomerOtpVerified(payload: { customerPhone: string; existingCustomer: boolean }) {
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:customer.otpVerified', eventPayload);
    this.server
      .to(this.customerRoom(customerPhone))
      .emit('workflow:customer.otpVerified', eventPayload);
  }

  emitAgreementFeedback(payload: {
    quotationId: string;
    quotationNumber: string;
    customerPhone: string;
    status: 'ACCEPTED' | 'REJECTED';
    reason?: string;
  }) {
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:agreement.feedback', eventPayload);
    this.server
      .to(this.customerRoom(customerPhone))
      .emit('workflow:agreement.feedback', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:agreement.feedback', eventPayload);
  }

  emitCustomerInterested(payload: {
    quotationId: string;
    quotationNumber: string;
    customerPhone: string;
    reason?: string;
  }) {
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:customer.interested', eventPayload);
    this.server
      .to(this.customerRoom(customerPhone))
      .emit('workflow:customer.interested', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:customer.interested', eventPayload);
  }

  private customerRoom(phone: string) {
    return `customer:${phone}`;
  }

  private quotationRoom(quotationId: string) {
    return `quotation:${quotationId}`;
  }

  private normalizePhone(phone: string) {
    return phone.replace(/[^\d+]/g, '').trim();
  }

  private extractBearer(authorization?: string | string[]) {
    const value = Array.isArray(authorization) ? authorization[0] : authorization;
    if (!value) return null;
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match?.[1] ?? null;
  }

  private async verifyPortalToken(token: string): Promise<PortalJwtPayload | null> {
    const secret =
      this.configService.get<string>('CUSTOMER_PORTAL_JWT_SECRET') ??
      this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) return null;
    try {
      const payload = await this.jwtService.verifyAsync<PortalJwtPayload>(token, {
        secret,
      });
      if (payload?.type !== 'customer_portal' || !payload?.phone) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  private async verifyAdminToken(token: string): Promise<AdminJwtPayload | null> {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) return null;
    try {
      return await this.jwtService.verifyAsync<AdminJwtPayload>(token, {
        secret,
      });
    } catch {
      return null;
    }
  }
}
