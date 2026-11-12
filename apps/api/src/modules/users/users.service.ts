import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { toSkipTake } from '../../common/dto/pagination.util';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new BadRequestException('Email already exists');
    }

    const normalizedPhone = dto.phone ? this.normalizePhone(dto.phone) : undefined;
    if (normalizedPhone) {
      await this.ensurePhoneIsAvailableForAdmin(normalizedPhone);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email,
        phone: normalizedPhone,
        passwordHash,
        role: dto.role,
      },
    });

    return this.toSafeUser(user);
  }

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { skip, take } = toSkipTake(page, limit);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: rows.map((r) => this.toSafeUser(r)),
      meta: { page, limit, total },
    };
  }

  async getCustomers() {
    const quotations = await this.prisma.quotation.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        quotationNumber: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        eventDate: true,
        eventType: true,
        venue: true,
        guestCount: true,
        grandTotal: true,
        status: true,
        requestStatus: true,
        agreementStatus: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const customerMap = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        address: string | null;
        totalQuotations: number;
        totalBookings: number;
        lifetimeValue: number;
        lastEventDate: Date | null;
        lastEventType: string | null;
        lastVenue: string | null;
        firstContactAt: Date;
        lastActivityAt: Date;
        latestStatus: string;
        quotations: Array<{
          id: string;
          quotationNumber: string;
          eventDate: Date;
          eventType: string;
          venue: string;
          guestCount: number;
          grandTotal: any;
          status: string;
          requestStatus: string | null;
          agreementStatus: string;
          createdAt: Date;
        }>;
      }
    >();

    for (const q of quotations) {
      const rawPhone = q.customerPhone ? q.customerPhone.trim() : '';
      const digits = rawPhone.replace(/\D/g, '');
      const key =
        digits.length >= 10
          ? digits.slice(-10)
          : rawPhone || q.customerName.trim().toLowerCase();

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: key,
          name: q.customerName,
          phone: q.customerPhone,
          address: q.customerAddress || null,
          totalQuotations: 0,
          totalBookings: 0,
          lifetimeValue: 0,
          lastEventDate: q.eventDate,
          lastEventType: q.eventType,
          lastVenue: q.venue,
          firstContactAt: q.createdAt,
          lastActivityAt: q.createdAt,
          latestStatus:
            q.agreementStatus === 'ACCEPTED'
              ? 'Agreement Accepted'
              : q.status === 'FINALIZED'
                ? 'Confirmed'
                : q.status,
          quotations: [],
        });
      }

      const c = customerMap.get(key)!;
      c.totalQuotations += 1;
      const numTotal = Number(q.grandTotal || 0);
      c.quotations.push({
        id: q.id,
        quotationNumber: q.quotationNumber,
        eventDate: q.eventDate,
        eventType: q.eventType,
        venue: q.venue,
        guestCount: q.guestCount,
        grandTotal: q.grandTotal,
        status: q.status,
        requestStatus: q.requestStatus,
        agreementStatus: q.agreementStatus,
        createdAt: q.createdAt,
      });

      if (q.status === 'FINALIZED' || q.agreementStatus === 'ACCEPTED') {
        c.totalBookings += 1;
        c.lifetimeValue += numTotal;
      }

      if (!c.address && q.customerAddress) {
        c.address = q.customerAddress;
      }
    }

    return Array.from(customerMap.values());
  }

  async findOne(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (exists) {
        throw new BadRequestException('Email already exists');
      }
    }

    const normalizedPhone = dto.phone ? this.normalizePhone(dto.phone) : undefined;
    if (normalizedPhone && normalizedPhone !== this.normalizePhone(user.phone ?? '')) {
      await this.ensurePhoneIsAvailableForAdmin(normalizedPhone, id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        email: dto.email,
        phone: normalizedPhone ?? dto.phone,
        role: dto.role,
        isActive: dto.isActive,
      },
    });

    return this.toSafeUser(updated);
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { message: 'Password reset successful' };
  }

  async remove(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  toSafeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role as Role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  private async ensurePhoneIsAvailableForAdmin(
    phone: string,
    excludeUserId?: string,
  ) {
    const userConflict = await this.prisma.user.findFirst({
      where: {
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        phone: {
          not: null,
          endsWith: phone,
        },
      },
      select: { id: true },
    });
    if (userConflict) {
      throw new BadRequestException('Phone number already exists');
    }

    const customerConflict = await this.prisma.quotation.findFirst({
      where: {
        isDeleted: false,
        OR: [{ customerPhone: phone }, { customerPhone: { endsWith: phone } }],
      },
      select: { id: true },
    });
    if (customerConflict) {
      throw new BadRequestException(
        'This phone number is already used by a customer account',
      );
    }
  }
}
