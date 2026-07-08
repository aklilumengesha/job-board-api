import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { JobType, ExperienceLevel, JobStatus } from '../../../common/enums';
import { PaginationDto } from '../../../common/dto';

export class JobFilterDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'developer', description: 'Search by title or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'San Francisco', description: 'Filter by location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    example: 'FULL_TIME',
    enum: JobType,
    description: 'Filter by job type',
  })
  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @ApiPropertyOptional({
    example: 'SENIOR',
    enum: ExperienceLevel,
    description: 'Filter by experience level',
  })
  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({
    example: 'ACTIVE',
    enum: JobStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ example: 'uuid', description: 'Filter by category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Minimum salary filter' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minSalary?: number;

  @ApiPropertyOptional({ example: 150000, description: 'Maximum salary filter' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxSalary?: number;

  @ApiPropertyOptional({ example: 'uuid', description: 'Filter by employer/company' })
  @IsOptional()
  @IsUUID()
  employerId?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Sort by field',
    enum: ['createdAt', 'updatedAt', 'title', 'salaryMin', 'salaryMax', 'views'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
