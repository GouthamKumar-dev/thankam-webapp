import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtUser } from '../../common/types/jwt-user.type';
import { Msg91Service } from '../notifications/msg91.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly msg91: Msg91Service,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.createTokenPair(user);

    return {
      ...tokens,
      user: this.usersService.toSafeUser(user),
    };
  }

  async refresh(user: JwtUser, refreshToken: string) {
    const dbUser = await this.usersService.findById(user.sub);
    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: user.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    let matchedTokenId: string | null = null;
    for (const token of activeTokens) {
      // Refresh token rotation checks token hash against active entries.
      const matched = await bcrypt.compare(refreshToken, token.tokenHash);
      if (matched) {
        matchedTokenId = token.id;
        break;
      }
    }

    if (!matchedTokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.createTokenPair(dbUser);

    await this.prisma.refreshToken.update({
      where: { id: matchedTokenId },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      ...tokens,
      user: this.usersService.toSafeUser(dbUser),
    };
  }

  async logout(refreshToken: string) {
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
      },
    });

    for (const token of activeTokens) {
      const matched = await bcrypt.compare(refreshToken, token.tokenHash);
      if (matched) {
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If the email exists, password reset instructions were sent' };
    }

    const rawToken = uuid();
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.sendPasswordResetEmail(user.email, resetUrl);

    return {
      message: 'If the email exists, password reset instructions were sent',
    };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const entries = await this.prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    let matched: (typeof entries)[number] | null = null;
    for (const entry of entries) {
      const ok = await bcrypt.compare(rawToken, entry.tokenHash);
      if (ok) {
        matched = entry;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hash = await bcrypt.hash(
      newPassword,
      Number(this.configService.get('BCRYPT_ROUNDS') ?? 12),
    );

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: matched.userId },
        data: { passwordHash: hash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: matched.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successful' };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.usersService.toSafeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const normalizedPhone = dto.phone ? this.normalizePhone(dto.phone) : undefined;
    if (normalizedPhone && normalizedPhone !== this.normalizePhone(user.phone ?? '')) {
      const userConflict = await this.prisma.user.findFirst({
        where: {
          id: { not: userId },
          phone: {
            not: null,
            endsWith: normalizedPhone,
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
          OR: [
            { customerPhone: normalizedPhone },
            { customerPhone: { endsWith: normalizedPhone } },
          ],
        },
        select: { id: true },
      });
      if (customerConflict) {
        throw new BadRequestException(
          'This phone number is already used by a customer account',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name?.trim() ?? undefined,
        phone: normalizedPhone ?? undefined,
      },
    });

    return this.usersService.toSafeUser(updated);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(
      newPassword,
      Number(this.configService.get('BCRYPT_ROUNDS') ?? 12),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  extractRefreshToken(req: Request, dtoToken?: string) {
    return req.cookies?.refreshToken ?? dtoToken ?? '';
  }

  setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: '/api/auth',
    });
  }

  private async createTokenPair(user: User): Promise<TokenPair> {
    const payload: JwtUser = {
      sub: user.id,
      role: user.role as Role,
      email: user.email,
      name: user.name,
    };

    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES') ?? '15m';
    const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES') ?? '7d';

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpires as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpires as any,
    });

    const refreshHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: this.getRefreshExpiryDate(),
      },
    });

    return { accessToken, refreshToken };
  }

  private getRefreshExpiryDate(): Date {
    const now = Date.now();
    const raw = this.configService.get<string>('JWT_REFRESH_EXPIRES') ?? '7d';
    const match = /^(\d+)([smhd])$/.exec(raw);

    if (!match) {
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(now + amount * multipliers[unit]);
  }

  private async sendPasswordResetEmail(email: string, resetUrl: string) {
    await this.msg91.sendEmail({
      to: { name: email, email },
      subject: 'Reset your Thankam Events password',
      html: `
        <p>Hello,</p>
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });
  }

  private normalizePhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
}
