import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthTokensDto, AuthUserDto, FERole } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Convert Prisma enum Role → lowercase string for FE */
  private toFERole(role: Role): FERole {
    return role === Role.FREELANCER ? 'freelancer' : 'client';
  }

  /** Map Prisma user → FE AuthUser shape (no password) */
  private toAuthUser(user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    role: Role;
    isKycVerified: boolean;
  }): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: this.toFERole(user.role),
      isKycVerified: user.isKycVerified,
    };
  }

  /** Sign a short-lived access token (15m by default) */
  private signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m') as any,
    });
  }

  /** Sign a long-lived refresh token (7d by default) and persist to DB */
  private async signRefreshToken(userId: string): Promise<string> {
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const token = this.jwt.sign({ sub: userId }, { expiresIn: expiresIn as any });

    // Compute expiry date from string (e.g. "7d")
    const days = parseInt(expiresIn.replace('d', ''), 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<AuthTokensDto> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role: this.toFERole(role),
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(userId),
    ]);
    return { accessToken, refreshToken };
  }

  // ─── Register ──────────────────────────────────────────────────────────────

  /**
   * POST /auth/register
   * Creates a new user and returns tokens + user info.
   */
  async register(
    dto: RegisterDto,
  ): Promise<{ tokens: AuthTokensDto; user: AuthUserDto }> {
    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const prismaRole: Role =
      dto.role === 'freelancer' ? Role.FREELANCER : Role.CLIENT;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
        role: prismaRole,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        isKycVerified: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { tokens, user: this.toAuthUser(user) };
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  /**
   * POST /auth/login
   * Verifies credentials, returns tokens.
   * Response shape (after interceptor): { data: { accessToken, refreshToken } }
   */
  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Mark online
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  // ─── Me ────────────────────────────────────────────────────────────────────

  /**
   * GET /auth/me
   * Returns the authenticated user's public profile.
   * Response shape: { data: AuthUser }
   */
  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        isKycVerified: true,
      },
    });
    return this.toAuthUser(user);
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  /**
   * POST /auth/refresh
   * Validates stored refresh token, issues new token pair (rotation).
   */
  async refresh(rawToken: string): Promise<AuthTokensDto> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: rawToken },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // Delete old token (rotation — one-time use)
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.generateTokens(stored.user.id, stored.user.email, stored.user.role);
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  /**
   * POST /auth/logout
   * Deletes all refresh tokens for user and marks offline.
   */
  async logout(userId: string): Promise<void> {
    await Promise.all([
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: false },
      }),
    ]);
  }
}
