import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import { CreateApplicationDto, UpdateApplicationStatusDto, ApplicationFilterDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { UserRole } from '../../common/enums';
import { resumeMulterOptions } from '../../infrastructure/storage/multer.config';

@ApiTags('Applications')
@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @Roles(UserRole.JOB_SEEKER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply for a job (Job Seeker only)' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only job seekers can apply' })
  @ApiResponse({ status: 409, description: 'Already applied for this job' })
  create(
    @CurrentUser('id') userId: string,
    @Body() createApplicationDto: CreateApplicationDto,
  ) {
    return this.applicationService.create(userId, createApplicationDto);
  }

  @Post('upload-resume')
  @Roles(UserRole.JOB_SEEKER)
  @UseInterceptors(FileInterceptor('resume', resumeMulterOptions))
  @ApiOperation({ summary: 'Upload resume to profile (Job Seeker only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resume: {
          type: 'string',
          format: 'binary',
          description: 'Resume file (PDF, DOC, DOCX - max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Resume uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  uploadResume(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.applicationService.uploadResume(userId, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all applications (filtered by role)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'ACCEPTED'] })
  @ApiQuery({ name: 'jobId', required: false, type: String })
  @ApiQuery({ name: 'jobSeekerId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @Query() filterDto: ApplicationFilterDto,
  ) {
    return this.applicationService.findAll(userId, userRole, filterDto);
  }

  @Get('my-stats')
  @Roles(UserRole.JOB_SEEKER)
  @ApiOperation({ summary: 'Get my application statistics (Job Seeker only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getMyStats(@CurrentUser('id') userId: string) {
    return this.applicationService.getJobSeekerStats(userId);
  }

  @Get('job/:jobId/stats')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get application statistics for a job (Employer/Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getJobStats(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.applicationService.getJobApplicationStats(jobId, userId, userRole);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  @ApiResponse({ status: 200, description: 'Application retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.applicationService.findOne(id, userId, userRole);
  }

  @Patch(':id/status')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update application status (Employer/Admin only)' })
  @ApiResponse({ status: 200, description: 'Application status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateApplicationStatusDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.applicationService.updateStatus(id, updateStatusDto, userId, userRole);
  }

  @Delete(':id')
  @Roles(UserRole.JOB_SEEKER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw application (Job Seeker only)' })
  @ApiResponse({ status: 200, description: 'Application withdrawn successfully' })
  @ApiResponse({ status: 400, description: 'Cannot withdraw this application' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.applicationService.withdraw(id, userId);
  }
}
