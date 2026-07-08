import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ example: 'uuid', description: 'Job ID to apply for' })
  @IsUUID()
  @IsNotEmpty()
  jobId: string;

  @ApiPropertyOptional({
    example: 'I am excited to apply for this position...',
    description: 'Cover letter',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  coverLetter?: string;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/resumes/resume.pdf',
    description: 'Resume URL (if not using profile resume)',
  })
  @IsOptional()
  @IsUrl()
  resumeUrl?: string;
}
