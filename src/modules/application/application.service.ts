import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { UserRole, ApplicationStatus } from '../../common/enums';
import { CreateApplicationDto, UpdateApplicationStatusDto, ApplicationFilterDto } from './dto';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a job application (Job Seeker only)
   */
  async create(userId: string, createApplicationDto: CreateApplicationDto) {
    const { jobId, coverLetter, resumeUrl } = createApplicationDto;

    // Get job seeker profile
    const jobSeeker = await this.prisma.jobSeeker.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!jobSeeker) {
      throw new ForbiddenException('Only job seekers can apply for jobs');
    }

    // Verify job exists and is active
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'ACTIVE') {
      throw new BadRequestException('This job is no longer accepting applications');
    }

    // Check if already applied
    const existingApplication = await this.prisma.application.findUnique({
      where: {
        jobId_jobSeekerId: {
          jobId,
          jobSeekerId: jobSeeker.id,
        },
      },
    });

    if (existingApplication) {
      throw new ConflictException('You have already applied for this job');
    }

    // Use provided resume URL or fall back to profile resume
    const finalResumeUrl = resumeUrl || jobSeeker.resumeUrl;

    if (!finalResumeUrl) {
      throw new BadRequestException(
        'Resume is required. Please upload a resume to your profile or provide one with this application.',
      );
    }

    // Create application
    const application = await this.prisma.application.create({
      data: {
        jobId,
        jobSeekerId: jobSeeker.id,
        coverLetter,
        resumeUrl: finalResumeUrl,
        status: 'PENDING',
      },
      include: {
        job: {
          include: {
            employer: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },
        jobSeeker: {
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
      },
    });

    // Queue notification to employer
    await this.queueService.addJob('application-notifications', 'new-application', {
      applicationId: application.id,
      jobId: job.id,
      jobTitle: job.title,
      applicantName: `${jobSeeker.user.firstName} ${jobSeeker.user.lastName}`,
      employerEmail: job.employer.user.email,
    });

    this.logger.log(
      `Application created: ${application.id} for job: ${jobId}`,
      'ApplicationService',
    );

    return application;
  }

  /**
   * Upload resume for application
   */
  async uploadResume(userId: string, file: Express.Multer.File) {
    // Get job seeker profile
    const jobSeeker = await this.prisma.jobSeeker.findUnique({
      where: { userId },
    });

    if (!jobSeeker) {
      throw new ForbiddenException('Only job seekers can upload resumes');
    }

    // Delete old resume if exists
    if (jobSeeker.resumeUrl) {
      try {
        await this.storageService.deleteFile(jobSeeker.resumeUrl);
      } catch (error) {
        this.logger.warn(`Failed to delete old resume: ${error.message}`, 'ApplicationService');
      }
    }

    // Upload new resume
    const uploadedFile = await this.storageService.uploadFile(file, { folder: 'resumes' });

    // Update job seeker profile with new resume URL
    const updatedJobSeeker = await this.prisma.jobSeeker.update({
      where: { id: jobSeeker.id },
      data: { resumeUrl: uploadedFile.url },
    });

    this.logger.log(`Resume uploaded for job seeker: ${jobSeeker.id}`, 'ApplicationService');

    return {
      resumeUrl: updatedJobSeeker.resumeUrl,
      message: 'Resume uploaded successfully',
    };
  }

  /**
   * Get all applications with filtering (different views for employer/job seeker)
   */
  async findAll(userId: string, userRole: UserRole, filterDto: ApplicationFilterDto) {
    const { page, limit, skip, status, jobId, jobSeekerId } = filterDto;

    let where: any = {};

    // Job Seeker can only see their own applications
    if (userRole === UserRole.JOB_SEEKER) {
      const jobSeeker = await this.prisma.jobSeeker.findUnique({
        where: { userId },
      });

      if (!jobSeeker) {
        throw new ForbiddenException('Job seeker profile not found');
      }

      where.jobSeekerId = jobSeeker.id;
    }
    // Employer can only see applications for their jobs
    else if (userRole === UserRole.EMPLOYER) {
      const employer = await this.prisma.employer.findUnique({
        where: { userId },
      });

      if (!employer) {
        throw new ForbiddenException('Employer profile not found');
      }

      where.job = { employerId: employer.id };
    }
    // Admin can see all applications (no filter)

    // Apply additional filters
    if (status) {
      where.status = status;
    }

    if (jobId) {
      where.jobId = jobId;
    }

    if (jobSeekerId && userRole === UserRole.ADMIN) {
      where.jobSeekerId = jobSeekerId;
    }

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        include: {
          job: {
            include: {
              employer: {
                select: {
                  id: true,
                  companyName: true,
                  companyLogo: true,
                },
              },
            },
          },
          jobSeeker: {
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
        },
        orderBy: { appliedAt: 'desc' },
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get application by ID
   */
  async findOne(id: string, userId: string, userRole: UserRole) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        job: {
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
          },
        },
        jobSeeker: {
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
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Authorization check
    const isOwner = application.jobSeeker.userId === userId;
    const isEmployer = application.job.employer.userId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isEmployer && !isAdmin) {
      throw new ForbiddenException('You do not have permission to view this application');
    }

    return application;
  }

  /**
   * Update application status (Employer only)
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdateApplicationStatusDto,
    userId: string,
    userRole: UserRole,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            employer: true,
          },
        },
        jobSeeker: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Only employer who posted the job or admin can update status
    if (application.job.employer.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the employer can update application status');
    }

    const updatedApplication = await this.prisma.application.update({
      where: { id },
      data: { status: updateStatusDto.status },
      include: {
        job: true,
        jobSeeker: {
          include: {
            user: true,
          },
        },
      },
    });

    // Queue notification to job seeker
    await this.queueService.addJob('application-notifications', 'status-updated', {
      applicationId: updatedApplication.id,
      jobTitle: updatedApplication.job.title,
      status: updateStatusDto.status,
      applicantEmail: updatedApplication.jobSeeker.user.email,
    });

    this.logger.log(
      `Application status updated: ${id} -> ${updateStatusDto.status}`,
      'ApplicationService',
    );

    return updatedApplication;
  }

  /**
   * Withdraw application (Job Seeker only)
   */
  async withdraw(id: string, userId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        jobSeeker: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Only the applicant can withdraw
    if (application.jobSeeker.userId !== userId) {
      throw new ForbiddenException('You can only withdraw your own applications');
    }

    // Cannot withdraw if already accepted or rejected
    if (application.status === 'ACCEPTED' || application.status === 'REJECTED') {
      throw new BadRequestException(
        `Cannot withdraw application with status: ${application.status}`,
      );
    }

    await this.prisma.application.delete({
      where: { id },
    });

    this.logger.log(`Application withdrawn: ${id}`, 'ApplicationService');

    return { message: 'Application withdrawn successfully' };
  }

  /**
   * Get application statistics for job seeker
   */
  async getJobSeekerStats(userId: string) {
    const jobSeeker = await this.prisma.jobSeeker.findUnique({
      where: { userId },
    });

    if (!jobSeeker) {
      throw new ForbiddenException('Job seeker profile not found');
    }

    const [
      totalApplications,
      pendingApplications,
      reviewingApplications,
      shortlistedApplications,
      rejectedApplications,
      acceptedApplications,
    ] = await Promise.all([
      this.prisma.application.count({ where: { jobSeekerId: jobSeeker.id } }),
      this.prisma.application.count({
        where: { jobSeekerId: jobSeeker.id, status: 'PENDING' },
      }),
      this.prisma.application.count({
        where: { jobSeekerId: jobSeeker.id, status: 'REVIEWING' },
      }),
      this.prisma.application.count({
        where: { jobSeekerId: jobSeeker.id, status: 'SHORTLISTED' },
      }),
      this.prisma.application.count({
        where: { jobSeekerId: jobSeeker.id, status: 'REJECTED' },
      }),
      this.prisma.application.count({
        where: { jobSeekerId: jobSeeker.id, status: 'ACCEPTED' },
      }),
    ]);

    return {
      totalApplications,
      byStatus: {
        pending: pendingApplications,
        reviewing: reviewingApplications,
        shortlisted: shortlistedApplications,
        rejected: rejectedApplications,
        accepted: acceptedApplications,
      },
    };
  }

  /**
   * Get application statistics for specific job (Employer)
   */
  async getJobApplicationStats(jobId: string, userId: string, userRole: UserRole) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { employer: true },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Only employer who posted the job or admin can view stats
    if (job.employer.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the employer can view job application statistics');
    }

    const [
      totalApplications,
      pendingApplications,
      reviewingApplications,
      shortlistedApplications,
      rejectedApplications,
      acceptedApplications,
    ] = await Promise.all([
      this.prisma.application.count({ where: { jobId } }),
      this.prisma.application.count({ where: { jobId, status: 'PENDING' } }),
      this.prisma.application.count({ where: { jobId, status: 'REVIEWING' } }),
      this.prisma.application.count({ where: { jobId, status: 'SHORTLISTED' } }),
      this.prisma.application.count({ where: { jobId, status: 'REJECTED' } }),
      this.prisma.application.count({ where: { jobId, status: 'ACCEPTED' } }),
    ]);

    return {
      jobId,
      jobTitle: job.title,
      totalApplications,
      byStatus: {
        pending: pendingApplications,
        reviewing: reviewingApplications,
        shortlisted: shortlistedApplications,
        rejected: rejectedApplications,
        accepted: acceptedApplications,
      },
    };
  }
}
