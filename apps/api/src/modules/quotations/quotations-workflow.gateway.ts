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
      const rooms = this.customerRooms(portalPayload.phone);
      for (const room of rooms) {
        await client.join(room);
      }
      this.logger.log(
        `Customer connected (${portalPayload.phone}) -> joined rooms: ${rooms.join(', ')}`,
      );
      client.emit('workflow:connected', { role: 'customer', rooms });
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
    if (!this.server) return;
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:request.created', eventPayload);
    this.emitToCustomer(payload.customerPhone, 'workflow:request.created', eventPayload);
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
    if (!this.server) return;
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:request.updated', eventPayload);
    this.emitToCustomer(payload.customerPhone, 'workflow:request.updated', eventPayload);
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
    if (!this.server) return;
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:request.status', eventPayload);
    this.emitToCustomer(payload.customerPhone, 'workflow:request.status', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:request.status', eventPayload);
  }

  emitQuotationStatusUpdated(payload: {
    quotationId: string;
    quotationNumber: string;
    customerPhone: string;
    status: string;
  }) {
    if (!this.server) return;
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:quotation.status', eventPayload);
    this.emitToCustomer(payload.customerPhone, 'workflow:quotation.status', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:quotation.status', eventPayload);
  }

  emitAgreementInitiated(payload: {
    quotationId: string;
    quotationNumber: string;
    customerPhone: string;
  }) {
    if (!this.server) return;
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:agreement.initiated', eventPayload);
    this.emitToCustomer(payload.customerPhone, 'workflow:agreement.initiated', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:agreement.initiated', eventPayload);
  }

  emitCustomerOtpVerified(payload: { customerPhone: string; existingCustomer: boolean }) {
    if (!this.server) return;
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:customer.otpVerified', eventPayload);
    this.emitToCustomer(payload.customerPhone, 'workflow:customer.otpVerified', eventPayload);
  }

  emitAgreementFeedback(payload: {
    quotationId: string;
    quotationNumber: string;
    customerPhone: string;
    status: 'ACCEPTED' | 'REJECTED';
    reason?: string;
  }) {
    if (!this.server) return;
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:agreement.feedback', eventPayload);
    this.emitToCustomer(payload.customerPhone, 'workflow:agreement.feedback', eventPayload);
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
    if (!this.server) return;
    const customerPhone = this.normalizePhone(payload.customerPhone);
    const eventPayload = {
      ...payload,
      customerPhone,
      updatedAt: new Date().toISOString(),
    };
    this.server.to('admin').emit('workflow:customer.interested', eventPayload);
    this.emitToCustomer(payload.customerPhone, 'workflow:customer.interested', eventPayload);
    this.server
      .to(this.quotationRoom(payload.quotationId))
      .emit('workflow:customer.interested', eventPayload);
  }

  private customerRoom(phone: string) {
    return `customer:${phone}`;
  }

  private customerRooms(phone?: string | null): string[] {
    if (!phone) return [];
    const normalized = this.normalizePhone(phone);
    const rawClean = phone.replace(/[^\d+]/g, '').trim();
    const rooms = new Set<string>();
    if (normalized) {
      rooms.add(this.customerRoom(normalized));
      rooms.add(this.customerRoom(`+91${normalized}`));
      rooms.add(this.customerRoom(`91${normalized}`));
    }
    if (rawClean) {
      rooms.add(this.customerRoom(rawClean));
    }
    return Array.from(rooms);
  }

  private emitToCustomer(phone: string, event: string, payload: any) {
    if (!this.server) return;
    const rooms = this.customerRooms(phone);
    for (const room of rooms) {
      this.server.to(room).emit(event, payload);
    }
  }

  private quotationRoom(quotationId: string) {
    return `quotation:${quotationId}`;
  }

  private normalizePhone(phone?: string | null): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
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
