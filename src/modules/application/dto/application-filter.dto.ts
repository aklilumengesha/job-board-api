import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApplicationStatus } from '../../../common/enums';
import { PaginationDto } from '../../../common/dto';

export class ApplicationFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'PENDING',
    enum: ApplicationStatus,
    description: 'Filter by application status',
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ example: 'uuid', description: 'Filter by job ID' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'Filter by job seeker ID' })
  @IsOptional()
  @IsUUID()
  jobSeekerId?: string;
}
