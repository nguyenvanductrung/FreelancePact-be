import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokensDto, AuthUserDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './strategies/jwt.strategy';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /auth/register ──────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký tài khoản mới (freelancer hoặc client)' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công', type: AuthTokensDto })
  @ApiResponse({ status: 409, description: 'Email đã được sử dụng' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async register(@Body() dto: RegisterDto) {
    const { tokens, user } = await this.authService.register(dto);
    // Return both tokens AND user info on register so FE can bootstrap session
    return { ...tokens, user };
  }

  // ─── POST /auth/login ─────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập — trả về accessToken + refreshToken' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công', type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Sai email hoặc mật khẩu' })
  async login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    // ResponseTransformInterceptor wraps this as { data: { accessToken, refreshToken }, message: "OK" }
    return this.authService.login(dto);
  }

  // ─── POST /auth/google ────────────────────────────────────────────────────

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng Google' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công', type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Xác thực Google thất bại' })
  async googleLogin(@Body() dto: GoogleLoginDto): Promise<AuthTokensDto> {
    return this.authService.loginWithGoogle(dto.accessToken);
  }

  // ─── GET /auth/me ─────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy thông tin user đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'AuthUser', type: AuthUserDto })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async me(@Request() req: RequestWithUser): Promise<AuthUserDto> {
    return this.authService.me(req.user.userId);
  }

  // ─── POST /auth/refresh ───────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  @ApiResponse({ status: 200, description: 'Token mới', type: AuthTokensDto })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  // ─── POST /auth/logout ────────────────────────────────────────────────────

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Đăng xuất — hủy tất cả refresh token' })
  @ApiResponse({ status: 204, description: 'Đăng xuất thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async logout(@Request() req: RequestWithUser): Promise<void> {
    await this.authService.logout(req.user.userId);
  }
}
