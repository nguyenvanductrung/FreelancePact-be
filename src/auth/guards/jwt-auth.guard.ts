import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects routes with JWT Bearer token.
 * Usage: @UseGuards(JwtAuthGuard)
 *
 * On success: req.user = { userId, email, role }
 * On failure: throws 401 UnauthorizedException
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
