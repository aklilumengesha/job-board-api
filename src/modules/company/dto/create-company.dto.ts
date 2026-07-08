import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Tech Innovators Inc', description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  companyName: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png', description: 'Company logo URL' })
  @IsOptional()
  @IsUrl()
  companyLogo?: string;

  @ApiPropertyOptional({ example: 'https://techinnovators.com', description: 'Company website' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA', description: 'Company location' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ example: 'We are a leading tech company...', description: 'Company description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'Technology', description: 'Industry sector' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string;
}
