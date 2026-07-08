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
import { CompanyService } from './company.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { PaginationDto } from '../../common/dto';
import { UserRole } from '../../common/enums';
import { imageMulterOptions } from '../../infrastructure/storage/multer.config';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @Roles(UserRole.EMPLOYER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create company profile (Employer only)' })
  @ApiResponse({ status: 201, description: 'Company profile created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only employers can create company profiles' })
  @ApiResponse({ status: 409, description: 'Conflict - Company profile already exists' })
  create(
    @CurrentUser('id') userId: string,
    @Body() createCompanyDto: CreateCompanyDto,
  ) {
    return this.companyService.create(userId, createCompanyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by company name, description, industry, or location' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.companyService.findAll(paginationDto, search);
  }

  @Get('my-company')
  @Roles(UserRole.EMPLOYER)
  @ApiOperation({ summary: 'Get my company profile (Employer only)' })
  @ApiResponse({ status: 200, description: 'Company profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company profile not found' })
  getMyCompany(@CurrentUser('id') userId: string) {
    return this.companyService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companyService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get company statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.companyService.getStats(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company profile' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.companyService.update(id, updateCompanyDto, userId, userRole);
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('logo', imageMulterOptions))
  @ApiOperation({ summary: 'Upload company logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Company logo image (PNG, JPG, JPEG - max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.companyService.uploadLogo(id, file, userId, userRole);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete company profile' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.companyService.remove(id, userId, userRole);
  }
}
