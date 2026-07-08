import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApplicationStatus } from '../../../common/enums';

export class UpdateApplicationStatusDto {
  @ApiProperty({
    example: 'REVIEWING',
    enum: ApplicationStatus,
    description: 'New application status',
  })
  @IsEnum(ApplicationStatus)
  @IsNotEmpty()
  status: ApplicationStatus;
}
