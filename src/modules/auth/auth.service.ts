import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { PasswordHelper } from '../../common/helpers/password.helper';
import { StringUtil } from '../../common/utils/string.util';
import { UserRole } from '../../common/enums';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { AuthResponse, JwtPayload } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Validate password strength
    const { valid, errors } = PasswordHelper.validateStrength(password);
    if (!valid) {
      throw new BadRequestException(`Password requirements not met: ${errors.join(', ')}`);
    }

    // Hash password
    const hashedPassword = await PasswordHelper.hash(password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      },
    });

    // Create role-specific profile
    if (role === UserRole.JOB_SEEKER) {
      await this.prisma.jobSeeker.create({
        data: {
          userId: user.id,
        },
      });
    } else if (role === UserRole.EMPLOYER) {
      await this.prisma.employer.create({
        data: {
          userId: user.id,
          companyName: '', // Will be updated in profile
        },
      });
    }

    // Generate email verification token
    const verificationToken = StringUtil.randomString(32);
    await this.cacheService.set(
      `email-verification:${verificationToken}`,
      user.id,
      24 * 60 * 60, // 24 hours
    );

    // Send welcome and verification emails
    try {
      await Promise.all([
        this.emailService.sendWelcomeEmail(user.email, user.firstName),
        this.emailService.sendVerificationEmail(
          user.email,
          user.firstName,
          verificationToken,
        ),
      ]);
    } catch (error) {
      this.logger.error('Failed to send registration emails', error.stack, 'AuthService');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);

    this.logger.log(`User registered: ${user.email}`, 'AuthService');

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        isVerified: user.isVerified,
      },
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await PasswordHelper.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);

    this.logger.log(`User logged in: ${user.email}`, 'AuthService');

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        isVerified: user.isVerified,
      },
    };
  }

  /**
   * Validate user for local strategy
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await PasswordHelper.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      });

      // Check if user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      const accessToken = await this.generateAccessToken(user.id, user.email, user.role as UserRole);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    // Get user ID from cache
    const userId = await this.cacheService.get<string>(`email-verification:${token}`);

    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user verification status
    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    // Delete verification token
    await this.cacheService.del(`email-verification:${token}`);

    this.logger.log(`Email verified for user: ${userId}`, 'AuthService');

    return { message: 'Email verified successfully' };
  }

  /**
   * Forgot password - send reset link
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If email exists, password reset link has been sent' };
    }

    // Generate reset token
    const resetToken = StringUtil.randomString(32);
    await this.cacheService.set(
      `password-reset:${resetToken}`,
      user.id,
      60 * 60, // 1 hour
    );

    // Send reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken,
      );
    } catch (error) {
      this.logger.error('Failed to send password reset email', error.stack, 'AuthService');
    }

    this.logger.log(`Password reset requested: ${user.email}`, 'AuthService');

    return { message: 'If email exists, password reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Get user ID from cache
    const userId = await this.cacheService.get<string>(`password-reset:${token}`);

    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate password strength
    const { valid, errors } = PasswordHelper.validateStrength(newPassword);
    if (!valid) {
      throw new BadRequestException(`Password requirements not met: ${errors.join(', ')}`);
    }

    // Hash new password
    const hashedPassword = await PasswordHelper.hash(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Delete reset token
    await this.cacheService.del(`password-reset:${token}`);

    this.logger.log(`Password reset for user: ${userId}`, 'AuthService');

    return { message: 'Password reset successfully' };
  }

  /**
   * Logout - blacklist token
   */
  async logout(userId: string, token: string): Promise<{ message: string }> {
    // Add token to blacklist (cache for remaining TTL)
    const decoded = this.jwtService.decode(token) as JwtPayload;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiresIn > 0) {
      await this.cacheService.set(`blacklist:${token}`, userId, expiresIn);
    }

    this.logger.log(`User logged out: ${userId}`, 'AuthService');

    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user profile
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, role),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate access token
   */
  private async generateAccessToken(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });
  }
}
