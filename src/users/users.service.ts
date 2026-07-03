import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves full profile including relations (badges, portfolio, experience).
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: true,
        portfolioItems: true,
        experience: {
          orderBy: { startYear: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      title: user.title,
      location: user.location,
      bio: user.bio,
      hourlyRate: user.hourlyRate,
      availabilityHoursPerWeek: user.availabilityHoursPerWeek,
      skills: (() => {
        try {
          return JSON.parse(user.skills || '[]') as string[];
        } catch {
          return [];
        }
      })(),
      successRate: user.successRate,
      totalContracts: user.totalContracts,
      rating: user.rating,
      isKycVerified: user.isKycVerified,
      isOnline: user.isOnline,
      badges: user.badges.map((b) => ({
        id: b.id,
        label: b.label,
        icon: b.icon,
      })),
      portfolioItems: user.portfolioItems.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        tag: p.tag,
      })),
      experience: user.experience.map((e) => ({
        id: e.id,
        role: e.role,
        company: e.company,
        startYear: e.startYear,
        endYear: e.endYear,
        description: e.description,
      })),
    };
  }

  /**
   * Updates only permitted profile fields. Returns updated profile.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    // Make sure user exists
    await this.getProfile(userId);

    const data: any = { ...dto };
    if (dto.skills) {
      data.skills = JSON.stringify(dto.skills);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.getProfile(userId);
  }
}
