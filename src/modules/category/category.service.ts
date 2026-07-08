import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { PaginationDto } from '../../common/dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoryService {
  private readonly CACHE_TTL = 7200; // 2 hours (categories change infrequently)
  private readonly CACHE_KEY_ALL = 'categories:all';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a new category (Admin only)
   */
  async create(createCategoryDto: CreateCategoryDto) {
    // Check if category name already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = await this.prisma.category.create({
      data: createCategoryDto,
    });

    // Invalidate cache
    await this.cacheService.del(this.CACHE_KEY_ALL);

    this.logger.log(`Category created: ${category.id} - ${category.name}`, 'CategoryService');

    return category;
  }

  /**
   * Get all categories (cached, public access)
   */
  async findAll(paginationDto?: PaginationDto) {
    // If no pagination, return all categories (cached)
    if (!paginationDto) {
      const cached = await this.cacheService.get(this.CACHE_KEY_ALL);
      if (cached) {
        return JSON.parse(cached as string);
      }

      const categories = await this.prisma.category.findMany({
        include: {
          _count: {
            select: { jobs: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Cache all categories
      await this.cacheService.set(
        this.CACHE_KEY_ALL,
        JSON.stringify(categories),
        this.CACHE_TTL,
      );

      return categories;
    }

    // With pagination
    const { page, limit, skip } = paginationDto;

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        skip,
        take: limit,
        include: {
          _count: {
            select: { jobs: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count(),
    ]);

    return {
      data: categories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get category by ID with job count
   */
  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Get category with its jobs
   */
  async findCategoryWithJobs(id: string, paginationDto: PaginationDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { page, limit, skip } = paginationDto;

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where: {
          categoryId: id,
          status: 'ACTIVE', // Only show active jobs
        },
        skip,
        take: limit,
        include: {
          employer: {
            select: {
              id: true,
              companyName: true,
              companyLogo: true,
              location: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.job.count({
        where: {
          categoryId: id,
          status: 'ACTIVE',
        },
      }),
    ]);

    return {
      category,
      jobs: {
        data: jobs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update category (Admin only)
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if new name already exists (if name is being changed)
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    // Invalidate cache
    await this.cacheService.del(this.CACHE_KEY_ALL);

    this.logger.log(`Category updated: ${id}`, 'CategoryService');

    return updatedCategory;
  }

  /**
   * Delete category (Admin only)
   */
  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Prevent deletion if category has jobs
    if (category._count.jobs > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.jobs} associated jobs. Please reassign or delete those jobs first.`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    // Invalidate cache
    await this.cacheService.del(this.CACHE_KEY_ALL);

    this.logger.log(`Category deleted: ${id}`, 'CategoryService');

    return { message: 'Category deleted successfully' };
  }

  /**
   * Get popular categories (most jobs)
   */
  async getPopularCategories(limit: number = 10) {
    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: {
            jobs: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
      orderBy: {
        jobs: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return categories.filter((cat) => cat._count.jobs > 0);
  }

  /**
   * Get category statistics
   */
  async getStats() {
    const [
      totalCategories,
      categoriesWithJobs,
      totalJobsInCategories,
      categoriesWithoutJobs,
    ] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.category.count({
        where: {
          jobs: {
            some: {},
          },
        },
      }),
      this.prisma.job.count({
        where: {
          categoryId: { not: null },
        },
      }),
      this.prisma.category.count({
        where: {
          jobs: {
            none: {},
          },
        },
      }),
    ]);

    return {
      totalCategories,
      categoriesWithJobs,
      categoriesWithoutJobs,
      totalJobsInCategories,
      averageJobsPerCategory:
        categoriesWithJobs > 0 ? Math.round(totalJobsInCategories / categoriesWithJobs) : 0,
    };
  }
}
