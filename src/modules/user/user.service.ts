import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { PasswordHelper } from '../../common/helpers/password.helper';
import { PaginationDto } from '../../common/dto';
import { UserRole } from '../../common/enums';
import { UpdateUserDto, ChangePasswordDto } from './dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get all users (Admin only, with pagination)
   */
  async findAll(paginationDto: PaginationDto) {
    const { page, limit, skip } = paginationDto;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user by ID
   */
  async findOne(id: string, requestingUserId: string, requestingUserRole: UserRole) {
    // Users can only view their own profile unless they're admin
    if (id !== requestingUserId && requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        jobSeeker: {
          select: {
            id: true,
            phone: true,
            resumeUrl: true,
            skills: true,
            experience: true,
            location: true,
            bio: true,
          },
        },
        employer: {
          select: {
            id: true,
            companyName: true,
            companyLogo: true,
            website: true,
            location: true,
            description: true,
            industry: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ) {
    // Users can only update their own profile unless they're admin
    if (id !== requestingUserId && requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // If email is being changed, check it's not already taken
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash password if provided
    const dataToUpdate: any = { ...updateUserDto };
    if (updateUserDto.password) {
      const { valid, errors } = PasswordHelper.validateStrength(updateUserDto.password);
      if (!valid) {
        throw new BadRequestException(`Password requirements not met: ${errors.join(', ')}`);
      }
      dataToUpdate.password = await PasswordHelper.hash(updateUserDto.password);
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isVerified: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Invalidate user cache
    await this.cacheService.del(`user:${id}`);

    this.logger.log(`User updated: ${id}`, 'UserService');

    return updatedUser;
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user with password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await PasswordHelper.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password strength
    const { valid, errors } = PasswordHelper.validateStrength(newPassword);
    if (!valid) {
      throw new BadRequestException(`Password requirements not met: ${errors.join(', ')}`);
    }

    // Hash and update password
    const hashedPassword = await PasswordHelper.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    this.logger.log(`Password changed for user: ${userId}`, 'UserService');

    return { message: 'Password changed successfully' };
  }

  /**
   * Deactivate user account (soft delete)
   */
  async remove(id: string, requestingUserId: string, requestingUserRole: UserRole) {
    // Users can deactivate their own account, or admin can deactivate any
    if (id !== requestingUserId && requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only deactivate your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by setting isActive to false
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate cache
    await this.cacheService.del(`user:${id}`);

    this.logger.log(`User deactivated: ${id}`, 'UserService');

    return { message: 'Account deactivated successfully' };
  }

  /**
   * Reactivate user account (Admin only)
   */
  async reactivate(id: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    // Invalidate cache
    await this.cacheService.del(`user:${id}`);

    this.logger.log(`User reactivated: ${id}`, 'UserService');

    return { message: 'Account reactivated successfully' };
  }

  /**
   * Get user statistics (Admin only)
   */
  async getStats() {
    const [
      totalUsers,
      jobSeekers,
      employers,
      admins,
      verifiedUsers,
      activeUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'JOB_SEEKER' } }),
      this.prisma.user.count({ where: { role: 'EMPLOYER' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    return {
      totalUsers,
      byRole: {
        jobSeekers,
        employers,
        admins,
      },
      verified: verifiedUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
    };
  }
}
