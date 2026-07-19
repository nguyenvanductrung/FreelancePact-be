import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
}

/** Attached to req.user after JWT validation */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Verify user still exists in DB and get their latest role
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: user.role, // This will be uppercase CLIENT or FREELANCER from database
    };
  }
}
