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
import { StorageService } from '../../infrastructure/storage/storage.service';
import { PaginationDto } from '../../common/dto';
import { UserRole } from '../../common/enums';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';

@Injectable()
export class CompanyService {
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly storageService: StorageService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create company profile (Employer only)
   */
  async create(userId: string, createCompanyDto: CreateCompanyDto) {
    // Check if user is an employer
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employer: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'EMPLOYER') {
      throw new ForbiddenException('Only employers can create company profiles');
    }

    if (user.employer) {
      throw new ConflictException('Company profile already exists for this user');
    }

    // Create company profile
    const company = await this.prisma.employer.create({
      data: {
        userId,
        ...createCompanyDto,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { jobs: true },
        },
      },
    });

    // Cache the company profile
    await this.cacheService.set(
      `company:${company.id}`,
      JSON.stringify(company),
      this.CACHE_TTL,
    );

    this.logger.log(`Company profile created: ${company.id}`, 'CompanyService');

    return company;
  }

  /**
   * Get all companies with pagination and search
   */
  async findAll(paginationDto: PaginationDto, search?: string) {
    const { page, limit, skip } = paginationDto;

    const where = search
      ? {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { industry: { contains: search, mode: 'insensitive' as const } },
            { location: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [companies, total] = await Promise.all([
      this.prisma.employer.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { jobs: true },
          },
        },
        orderBy: { companyName: 'asc' },
      }),
      this.prisma.employer.count({ where }),
    ]);

    return {
      data: companies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get company by ID
   */
  async findOne(id: string) {
    // Try cache first
    const cached = await this.cacheService.get(`company:${id}`);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const company = await this.prisma.employer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        jobs: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            title: true,
            location: true,
            jobType: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { jobs: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Cache the result
    await this.cacheService.set(
      `company:${id}`,
      JSON.stringify(company),
      this.CACHE_TTL,
    );

    return company;
  }

  /**
   * Get company by user ID
   */
  async findByUserId(userId: string) {
    const company = await this.prisma.employer.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { jobs: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company profile not found for this user');
    }

    return company;
  }

  /**
   * Update company profile
   */
  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
    userId: string,
    userRole: UserRole,
  ) {
    const company = await this.prisma.employer.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Only the company owner or admin can update
    if (company.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own company profile');
    }

    const updatedCompany = await this.prisma.employer.update({
      where: { id },
      data: updateCompanyDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { jobs: true },
        },
      },
    });

    // Invalidate cache
    await this.cacheService.del(`company:${id}`);

    this.logger.log(`Company profile updated: ${id}`, 'CompanyService');

    return updatedCompany;
  }

  /**
   * Upload company logo
   */
  async uploadLogo(
    id: string,
    file: Express.Multer.File,
    userId: string,
    userRole: UserRole,
  ) {
    const company = await this.prisma.employer.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Only the company owner or admin can update
    if (company.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own company profile');
    }

    // Delete old logo if exists
    if (company.companyLogo) {
      try {
        await this.storageService.deleteFile(company.companyLogo);
      } catch (error) {
        this.logger.warn(`Failed to delete old logo: ${error.message}`, 'CompanyService');
      }
    }

    // Upload new logo
    const uploadedFile = await this.storageService.uploadFile(file, { folder: 'logos' });

    // Update company with new logo
    const updatedCompany = await this.prisma.employer.update({
      where: { id },
      data: { companyLogo: uploadedFile.url },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Invalidate cache
    await this.cacheService.del(`company:${id}`);

    this.logger.log(`Company logo updated: ${id}`, 'CompanyService');

    return updatedCompany;
  }

  /**
   * Delete company profile (soft delete by deactivating user)
   */
  async remove(id: string, userId: string, userRole: UserRole) {
    const company = await this.prisma.employer.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Only the company owner or admin can delete
    if (company.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own company profile');
    }

    // Delete company logo if exists
    if (company.companyLogo) {
      try {
        await this.storageService.deleteFile(company.companyLogo);
      } catch (error) {
        this.logger.warn(`Failed to delete logo: ${error.message}`, 'CompanyService');
      }
    }

    // Delete the company profile (will cascade delete jobs)
    await this.prisma.employer.delete({
      where: { id },
    });

    // Invalidate cache
    await this.cacheService.del(`company:${id}`);

    this.logger.log(`Company profile deleted: ${id}`, 'CompanyService');

    return { message: 'Company profile deleted successfully' };
  }

  /**
   * Get company statistics
   */
  async getStats(id: string) {
    const company = await this.prisma.employer.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const [
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      totalApplications,
      pendingApplications,
    ] = await Promise.all([
      this.prisma.job.count({ where: { employerId: id } }),
      this.prisma.job.count({ where: { employerId: id, status: 'ACTIVE' } }),
      this.prisma.job.count({ where: { employerId: id, status: 'DRAFT' } }),
      this.prisma.job.count({ where: { employerId: id, status: 'CLOSED' } }),
      this.prisma.application.count({
        where: { job: { employerId: id } },
      }),
      this.prisma.application.count({
        where: { job: { employerId: id }, status: 'PENDING' },
      }),
    ]);

    return {
      companyId: id,
      companyName: company.companyName,
      jobs: {
        total: totalJobs,
        active: activeJobs,
        draft: draftJobs,
        closed: closedJobs,
      },
      applications: {
        total: totalApplications,
        pending: pendingApplications,
      },
    };
  }
}
