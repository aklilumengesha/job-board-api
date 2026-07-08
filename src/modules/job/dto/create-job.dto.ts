import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobType, ExperienceLevel, JobStatus } from '../../../common/enums';

export class CreateJobDto {
  @ApiProperty({ example: 'Senior Full Stack Developer', description: 'Job title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'We are looking for an experienced full stack developer...',
    description: 'Job description',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(5000)
  description: string;

  @ApiProperty({
    example: ['5+ years of experience', 'Strong knowledge of Node.js', 'React expertise'],
    description: 'Job requirements',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  requirements: string[];

  @ApiProperty({ example: 'San Francisco, CA (Remote Available)', description: 'Job location' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location: string;

  @ApiProperty({
    example: 'FULL_TIME',
    enum: JobType,
    description: 'Type of employment',
  })
  @IsEnum(JobType)
  jobType: JobType;

  @ApiProperty({
    example: 'SENIOR',
    enum: ExperienceLevel,
    description: 'Required experience level',
  })
  @IsEnum(ExperienceLevel)
  experienceLevel: ExperienceLevel;

  @ApiPropertyOptional({ example: 100000, description: 'Minimum salary in USD' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  salaryMin?: number;

  @ApiPropertyOptional({ example: 150000, description: 'Maximum salary in USD' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  salaryMax?: number;

  @ApiPropertyOptional({ example: 'uuid', description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 'DRAFT',
    enum: JobStatus,
    description: 'Job status',
    default: JobStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59Z',
    description: 'Job expiration date',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
