import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { UserRole } from '../../common/enums';
import { CreateJobDto, UpdateJobDto, JobFilterDto } from './dto';

@Injectable()
export class JobService {
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly queueService: QueueService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a new job posting (Employer only)
   */
  async create(userId: string, createJobDto: CreateJobDto) {
    // Get employer profile
    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new ForbiddenException('Only employers can create job postings');
    }

    // Validate salary range
    if (
      createJobDto.salaryMin &&
      createJobDto.salaryMax &&
      createJobDto.salaryMin > createJobDto.salaryMax
    ) {
      throw new BadRequestException('Minimum salary cannot be greater than maximum salary');
    }

    // Create job
    const job = await this.prisma.job.create({
      data: {
        employerId: employer.id,
        ...createJobDto,
        expiresAt: createJobDto.expiresAt ? new Date(createJobDto.expiresAt) : null,
      },
      include: {
        employer: {
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
        },
        category: true,
      },
    });

    // Queue job for notifications if status is ACTIVE
    if (job.status === 'ACTIVE') {
      await this.queueService.addJob('job-notifications', 'new-job-posted', {
        jobId: job.id,
        jobTitle: job.title,
        companyName: job.employer.companyName,
      });
    }

    this.logger.log(`Job created: ${job.id}`, 'JobService');

    return job;
  }

  /**
   * Find all jobs with advanced filtering and search
   */
  async findAll(filterDto: JobFilterDto) {
    const {
      page,
      limit,
      skip,
      search,
      location,
      jobType,
      experienceLevel,
      status,
      categoryId,
      minSalary,
      maxSalary,
      employerId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    // Build where clause
    const where: any = {};

    // Search in title and description
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Location filter
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Job type filter
    if (jobType) {
      where.jobType = jobType;
    }

    // Experience level filter
    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }

    // Status filter (default to ACTIVE for public view)
    if (status) {
      where.status = status;
    } else {
      where.status = 'ACTIVE'; // Only show active jobs by default
    }

    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Employer filter
    if (employerId) {
      where.employerId = employerId;
    }

    // Salary range filter
    if (minSalary || maxSalary) {
      where.AND = where.AND || [];

      if (minSalary) {
        where.AND.push({
          OR: [
            { salaryMin: { gte: minSalary } },
            { salaryMax: { gte: minSalary } },
          ],
        });
      }

      if (maxSalary) {
        where.AND.push({
          OR: [
            { salaryMin: { lte: maxSalary } },
            { salaryMax: { lte: maxSalary } },
          ],
        });
      }
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'views') {
      orderBy[sortBy] = sortOrder;
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else if (sortBy === 'salaryMin') {
      orderBy.salaryMin = sortOrder;
    } else if (sortBy === 'salaryMax') {
      orderBy.salaryMax = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        include: {
          employer: {
            select: {
              id: true,
              companyName: true,
              companyLogo: true,
              location: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
        orderBy,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get job by ID with view count increment
   */
  async findOne(id: string, incrementViews: boolean = true) {
    // Try cache first
    const cacheKey = `job:${id}`;
    const cached = await this.cacheService.get(cacheKey);
    
    let job;
    
    if (cached) {
      job = JSON.parse(cached as string);
    } else {
      job = await this.prisma.job.findUnique({
        where: { id },
        include: {
          employer: {
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
          },
          category: true,
          _count: {
            select: {
              applications: true,
              savedBy: true,
            },
          },
        },
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      // Cache the result
      await this.cacheService.set(cacheKey, JSON.stringify(job), this.CACHE_TTL);
    }

    // Increment views asynchronously (don't wait for it)
    if (incrementViews) {
      this.prisma.job
        .update({
          where: { id },
          data: { views: { increment: 1 } },
        })
        .then(() => {
          // Invalidate cache after view increment
          this.cacheService.del(cacheKey);
        })
        .catch((error) => {
          this.logger.error(`Failed to increment job views: ${error.message}`, 'JobService');
        });
    }

    return job;
  }

  /**
   * Get jobs posted by current employer
   */
  async findMyJobs(userId: string, filterDto: JobFilterDto) {
    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new ForbiddenException('Only employers can view their jobs');
    }

    // Create new filter with employer ID and remove status filter
    const myJobsFilter = new JobFilterDto();
    Object.assign(myJobsFilter, filterDto);
    myJobsFilter.employerId = employer.id;
    // Don't filter by status for employer's own jobs (show all statuses)
    delete (myJobsFilter as any).status;

    return this.findAll(myJobsFilter);
  }

  /**
   * Update job posting
   */
  async update(id: string, updateJobDto: UpdateJobDto, userId: string, userRole: UserRole) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { employer: true },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check authorization
    if (job.employer.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own job postings');
    }

    // Validate salary range if both are provided
    if (updateJobDto.salaryMin !== undefined && updateJobDto.salaryMax !== undefined) {
      const newMin = updateJobDto.salaryMin ?? job.salaryMin;
      const newMax = updateJobDto.salaryMax ?? job.salaryMax;
      
      if (newMin && newMax && newMin > newMax) {
        throw new BadRequestException('Minimum salary cannot be greater than maximum salary');
      }
    }

    const updatedJob = await this.prisma.job.update({
      where: { id },
      data: {
        ...updateJobDto,
        expiresAt: updateJobDto.expiresAt ? new Date(updateJobDto.expiresAt) : undefined,
      },
      include: {
        employer: {
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
        },
        category: true,
      },
    });

    // Invalidate cache
    await this.cacheService.del(`job:${id}`);

    this.logger.log(`Job updated: ${id}`, 'JobService');

    return updatedJob;
  }

  /**
   * Change job status
   */
  async updateStatus(id: string, status: string, userId: string, userRole: UserRole) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { employer: true },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check authorization
    if (job.employer.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own job postings');
    }

    const updatedJob = await this.prisma.job.update({
      where: { id },
      data: { status: status as any },
    });

    // Invalidate cache
    await this.cacheService.del(`job:${id}`);

    this.logger.log(`Job status updated: ${id} -> ${status}`, 'JobService');

    return updatedJob;
  }

  /**
   * Delete job posting
   */
  async remove(id: string, userId: string, userRole: UserRole) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { employer: true },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check authorization
    if (job.employer.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own job postings');
    }

    await this.prisma.job.delete({
      where: { id },
    });

    // Invalidate cache
    await this.cacheService.del(`job:${id}`);

    this.logger.log(`Job deleted: ${id}`, 'JobService');

    return { message: 'Job deleted successfully' };
  }

  /**
   * Get job statistics for employer
   */
  async getEmployerStats(userId: string) {
    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new ForbiddenException('Only employers can view job statistics');
    }

    const [
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      totalViews,
      totalApplications,
    ] = await Promise.all([
      this.prisma.job.count({ where: { employerId: employer.id } }),
      this.prisma.job.count({ where: { employerId: employer.id, status: 'ACTIVE' } }),
      this.prisma.job.count({ where: { employerId: employer.id, status: 'DRAFT' } }),
      this.prisma.job.count({ where: { employerId: employer.id, status: 'CLOSED' } }),
      this.prisma.job.aggregate({
        where: { employerId: employer.id },
        _sum: { views: true },
      }),
      this.prisma.application.count({
        where: { job: { employerId: employer.id } },
      }),
    ]);

    return {
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      totalViews: totalViews._sum.views || 0,
      totalApplications,
    };
  }

  /**
   * Get similar jobs based on job type and category
   */
  async getSimilarJobs(id: string, limit: number = 5) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const similarJobs = await this.prisma.job.findMany({
      where: {
        id: { not: id },
        status: 'ACTIVE',
        OR: [
          { jobType: job.jobType },
          { categoryId: job.categoryId },
          { experienceLevel: job.experienceLevel },
        ],
      },
      take: limit,
      include: {
        employer: {
          select: {
            id: true,
            companyName: true,
            companyLogo: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return similarJobs;
  }
}
