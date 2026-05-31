import { ApiProperty } from '@nestjs/swagger';

/** FE expects role in lowercase: "freelancer" | "client" */
export type FERole = 'freelancer' | 'client';

/**
 * Matches FE's AuthUser interface exactly (types/index.ts).
 * Password is intentionally excluded.
 */
export class AuthUserDto {
  @ApiProperty({ example: 'cld8x2k9f0000abc123' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName: string;

  @ApiProperty({ example: 'https://cdn.example.com/avatar.png', nullable: true })
  avatarUrl: string | null;

  /** lowercase as FE expects */
  @ApiProperty({ enum: ['freelancer', 'client'], example: 'freelancer' })
  role: FERole;

  @ApiProperty({ example: false })
  isKycVerified: boolean;
}

/** Matches FE's AuthTokens interface */
export class AuthTokensDto {
  @ApiProperty({ example: 'eyJhbGci...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGci...' })
  refreshToken: string;
}
