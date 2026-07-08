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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JobService } from './job.service';
import { CreateJobDto, UpdateJobDto, JobFilterDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole, JobStatus } from '../../common/enums';

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @Roles(UserRole.EMPLOYER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create job posting (Employer only)' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only employers can create jobs' })
  create(
    @CurrentUser('id') userId: string,
    @Body() createJobDto: CreateJobDto,
  ) {
    return this.jobService.create(userId, createJobDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all jobs with filters and search' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'location', required: false, type: String })
  @ApiQuery({ name: 'jobType', required: false, enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'] })
  @ApiQuery({ name: 'experienceLevel', required: false, enum: ['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD'] })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'ACTIVE', 'CLOSED', 'EXPIRED'] })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'minSalary', required: false, type: Number })
  @ApiQuery({ name: 'maxSalary', required: false, type: Number })
  @ApiQuery({ name: 'employerId', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'updatedAt', 'title', 'salaryMin', 'salaryMax', 'views'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  findAll(@Query() filterDto: JobFilterDto) {
    return this.jobService.findAll(filterDto);
  }

  @Get('my-jobs')
  @Roles(UserRole.EMPLOYER)
  @ApiOperation({ summary: 'Get my job postings (Employer only)' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findMyJobs(
    @CurrentUser('id') userId: string,
    @Query() filterDto: JobFilterDto,
  ) {
    return this.jobService.findMyJobs(userId, filterDto);
  }

  @Get('stats')
  @Roles(UserRole.EMPLOYER)
  @ApiOperation({ summary: 'Get job statistics (Employer only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getStats(@CurrentUser('id') userId: string) {
    return this.jobService.getEmployerStats(userId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.findOne(id);
  }

  @Get(':id/similar')
  @Public()
  @ApiOperation({ summary: 'Get similar jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiResponse({ status: 200, description: 'Similar jobs retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getSimilarJobs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.jobService.getSimilarJobs(id, limit);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update job posting' })
  @ApiResponse({ status: 200, description: 'Job updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJobDto: UpdateJobDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.jobService.update(id, updateJobDto, userId, userRole);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job status' })
  @ApiResponse({ status: 200, description: 'Job status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: JobStatus,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.jobService.updateStatus(id, status, userId, userRole);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete job posting' })
  @ApiResponse({ status: 200, description: 'Job deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.jobService.remove(id, userId, userRole);
  }
}
