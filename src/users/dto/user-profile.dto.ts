import { ApiProperty } from '@nestjs/swagger';

export class BadgeDto {
  @ApiProperty() id: string;
  @ApiProperty() label: string;
  @ApiProperty() icon: string;
}

export class PortfolioItemDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ required: false }) description: string | null;
  @ApiProperty({ required: false }) imageUrl: string | null;
  @ApiProperty({ required: false }) tag: string | null;
}

export class ExperienceDto {
  @ApiProperty() id: string;
  @ApiProperty() role: string;
  @ApiProperty() company: string;
  @ApiProperty() startYear: number;
  @ApiProperty({ required: false }) endYear: number | null;
  @ApiProperty({ required: false }) description: string | null;
}

export class UserProfileDto {
  @ApiProperty() id: string;
  @ApiProperty() fullName: string;
  @ApiProperty({ required: false }) title: string | null;
  @ApiProperty({ required: false }) location: string | null;
  @ApiProperty({ required: false }) bio: string | null;
  @ApiProperty({ required: false }) hourlyRate: number | null;
  @ApiProperty({ required: false }) availabilityHoursPerWeek: number | null;
  @ApiProperty() skills: string[];
  @ApiProperty() successRate: number;
  @ApiProperty() totalContracts: number;
  @ApiProperty() rating: number;
  @ApiProperty() isKycVerified: boolean;
  @ApiProperty() isOnline: boolean;

  @ApiProperty({ type: [BadgeDto] }) badges: BadgeDto[];
  @ApiProperty({ type: [PortfolioItemDto] }) portfolioItems: PortfolioItemDto[];
  @ApiProperty({ type: [ExperienceDto] }) experience: ExperienceDto[];
}
