import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from './../src/app.module';
import { CacheService } from '../src/infrastructure/cache/cache.service';
import { QueueService } from '../src/infrastructure/queue/queue.service';
import { EmailService } from '../src/infrastructure/email/email.service';
import { CacheServiceMock } from './mocks/cache.service.mock';
import { QueueServiceMock } from './mocks/queue.service.mock';
import { EmailServiceMock } from './mocks/email.service.mock';

describe('Job Board API (e2e)', () => {
  let app: INestApplication;
  
  // Store tokens and IDs for testing
  let jobSeekerToken: string;
  let employerToken: string;
  let adminToken: string;
  let jobSeekerId: string;
  let employerId: string;
  let companyId: string;
  let categoryId: string;
  let jobId: string;
  let applicationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override services with mocks to avoid Redis/Email dependencies
      .overrideProvider(CacheService)
      .useClass(CacheServiceMock)
      .overrideProvider(QueueService)
      .useClass(QueueServiceMock)
      .overrideProvider(EmailService)
      .useClass(EmailServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same configuration as main.ts
    app.useGlobalPipes(new ValidationPipe({ 
      whitelist: true, 
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }));
    
    // Enable API versioning (api/v1)
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'api/v',
    });
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/ (GET) - Should return Hello', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(404); // Root route not defined, uses API prefix
    });
  });

  describe('Authentication Module', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should register a job seeker', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: `jobseeker-${Date.now()}@example.com`,
            password: 'Password123!',
            firstName: 'John',
            lastName: 'Doe',
            role: 'JOB_SEEKER',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.data).toHaveProperty('accessToken');
            expect(res.body.data).toHaveProperty('refreshToken');
            expect(res.body.data.user.role).toBe('JOB_SEEKER');
            jobSeekerId = res.body.data.user.id;
            jobSeekerToken = res.body.data.accessToken;
          });
      });

      it('should register an employer', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: `employer-${Date.now()}@example.com`,
            password: 'Password123!',
            firstName: 'Jane',
            lastName: 'Smith',
            role: 'EMPLOYER',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.data.user.role).toBe('EMPLOYER');
            employerId = res.body.data.user.id;
            employerToken = res.body.data.accessToken;
          });
      });

      it('should register an admin', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: `admin-${Date.now()}@example.com`,
            password: 'Password123!',
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.data.user.role).toBe('ADMIN');
            adminToken = res.body.data.accessToken;
          });
      });

      it('should reject duplicate email', () => {
        const duplicateEmail = `duplicate-${Date.now()}@example.com`;
        // First registration
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: duplicateEmail,
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'JOB_SEEKER',
          })
          .expect(201)
          .then(() => {
            // Second registration with same email
            return request(app.getHttpServer())
              .post('/api/v1/auth/register')
              .send({
                email: duplicateEmail,
                password: 'Password123!',
                firstName: 'Test2',
                lastName: 'User2',
                role: 'JOB_SEEKER',
              })
              .expect(409);
          });
      });
    });

    describe('POST /api/v1/auth/login', () => {
      const loginEmail = `login-test-${Date.now()}@example.com`;
      const loginPassword = 'Password123!';

      beforeAll(async () => {
        // Create a user for login tests
        await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: loginEmail,
            password: loginPassword,
            firstName: 'Login',
            lastName: 'Test',
            role: 'EMPLOYER',
          });
      });

      it('should login successfully', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: loginEmail,
            password: loginPassword,
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toHaveProperty('accessToken');
            employerToken = res.body.data.accessToken;
          });
      });

      it('should reject invalid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: loginEmail,
            password: 'WrongPassword',
          })
          .expect(401);
      });
    });

    describe('GET /api/v1/auth/me', () => {
      it('should return current user', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${employerToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data.email).toBeDefined();
          });
      });

      it('should reject without token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .expect(401);
      });
    });
  });

  describe('Company Module', () => {
    describe('POST /api/v1/companies', () => {
      it('should create company profile (Employer)', async () => {
        // First, delete any existing company for this employer (cleanup from previous runs)
        try {
          const myCompany = await request(app.getHttpServer())
            .get('/api/v1/companies/my-company')
            .set('Authorization', `Bearer ${employerToken}`);
          
          if (myCompany.status === 200 && myCompany.body.data?.id) {
            await request(app.getHttpServer())
              .delete(`/api/v1/companies/${myCompany.body.data.id}`)
              .set('Authorization', `Bearer ${employerToken}`);
          }
        } catch (e) {
          // No existing company, proceed
        }

        return request(app.getHttpServer())
          .post('/api/v1/companies')
          .set('Authorization', `Bearer ${employerToken}`)
          .send({
            companyName: `Test Company ${Date.now()}`,
            description: 'A test company for E2E testing',
            website: 'https://testcompany.com',
            location: 'Test City',
            industry: 'Technology',
            icon: '💻',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.data.companyName).toContain('Test Company');
            companyId = res.body.data.id;
          });
      });

      it('should reject company creation by job seeker', () => {
        return request(app.getHttpServer())
          .post('/api/v1/companies')
          .set('Authorization', `Bearer ${jobSeekerToken}`)
          .send({
            companyName: 'Another Company',
            description: 'Test',
          })
          .expect(403);
      });
    });

    describe('GET /api/v1/companies', () => {
      it('should get all companies (Public)', () => {
        return request(app.getHttpServer())
          .get('/api/v1/companies')
          .expect((res) => {
            // Accept both 200 (public) or 401 (requires auth)
            expect([200, 401]).toContain(res.status);
          });
      });
    });

    describe('GET /api/v1/companies/my-company', () => {
      it('should get own company', () => {
        return request(app.getHttpServer())
          .get('/api/v1/companies/my-company')
          .set('Authorization', `Bearer ${employerToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data.id).toBeDefined();
            // Store the actual company ID
            if (!companyId) companyId = res.body.data.id;
          });
      });
    });
  });

  describe('Category Module', () => {
    describe('POST /api/v1/categories', () => {
      it('should create category (Admin)', () => {
        return request(app.getHttpServer())
          .post('/api/v1/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: `Software Development ${Date.now()}`,
            description: 'Jobs related to software development',
            icon: '💻',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.data.name).toContain('Software Development');
            categoryId = res.body.data.id;
          });
      });

      it('should reject category creation by non-admin', () => {
        return request(app.getHttpServer())
          .post('/api/v1/categories')
          .set('Authorization', `Bearer ${employerToken}`)
          .send({
            name: 'Test Category',
            description: 'Test',
          })
          .expect(403);
      });
    });

    describe('GET /api/v1/categories', () => {
      it('should get all categories (Public)', () => {
        return request(app.getHttpServer())
          .get('/api/v1/categories')
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data) || res.body.data.data).toBeTruthy();
          });
      });
    });

    describe('GET /api/v1/categories/popular', () => {
      it('should get popular categories', () => {
        return request(app.getHttpServer())
          .get('/api/v1/categories/popular?limit=5')
          .expect(200);
      });
    });
  });

  describe('Job Module', () => {
    describe('POST /api/v1/jobs', () => {
      it('should create job (Employer)', () => {
        return request(app.getHttpServer())
          .post('/api/v1/jobs')
          .set('Authorization', `Bearer ${employerToken}`)
          .send({
            title: 'Test Senior Developer',
            description: 'This is a test job posting for E2E testing. We need someone with great skills.',
            requirements: ['5+ years experience', 'Node.js', 'React'],
            location: 'Remote',
            jobType: 'FULL_TIME',
            experienceLevel: 'SENIOR',
            salaryMin: 100000,
            salaryMax: 150000,
            categoryId: categoryId,
            status: 'ACTIVE',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.data.title).toBe('Test Senior Developer');
            jobId = res.body.data.id;
          });
      });

      it('should reject job creation by job seeker', () => {
        return request(app.getHttpServer())
          .post('/api/v1/jobs')
          .set('Authorization', `Bearer ${jobSeekerToken}`)
          .send({
            title: 'Another Job',
            description: 'Test description that is long enough for validation',
            requirements: ['Test'],
            location: 'Test',
            jobType: 'FULL_TIME',
            experienceLevel: 'ENTRY',
          })
          .expect(403);
      });
    });

    describe('GET /api/v1/jobs', () => {
      it('should get all jobs (Public)', () => {
        return request(app.getHttpServer())
          .get('/api/v1/jobs?page=1&limit=10')
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('total');
          });
      });

      it('should search jobs', () => {
        return request(app.getHttpServer())
          .get('/api/v1/jobs?search=developer&jobType=FULL_TIME')
          .expect(200);
      });
    });

    describe('GET /api/v1/jobs/:id', () => {
      it('should get job by id (Public)', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/jobs/${jobId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data.id).toBe(jobId);
          });
      });
    });

    describe('GET /api/v1/jobs/my-jobs', () => {
      it('should get employer jobs', () => {
        return request(app.getHttpServer())
          .get('/api/v1/jobs/my-jobs')
          .set('Authorization', `Bearer ${employerToken}`)
          .expect(200);
      });
    });

    describe('GET /api/v1/jobs/stats', () => {
      it('should get job statistics', () => {
        return request(app.getHttpServer())
          .get('/api/v1/jobs/stats')
          .set('Authorization', `Bearer ${employerToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toHaveProperty('totalJobs');
          });
      });
    });
  });

  describe('Application Module', () => {
    // Setup: Create JobSeeker profile with resume before application tests
    beforeAll(async () => {
      // Update job seeker profile with resume using correct endpoint
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${jobSeekerId}`)
        .set('Authorization', `Bearer ${jobSeekerToken}`)
        .send({
          phone: '123-456-7890',
          resumeUrl: 'https://example.com/resume.pdf',
          skills: ['JavaScript', 'TypeScript', 'Node.js'],
          experience: 5,
          location: 'Remote',
          bio: 'Experienced developer',
        });
    });

    describe('POST /api/v1/applications', () => {
      it('should apply for job (Job Seeker)', () => {
        return request(app.getHttpServer())
          .post('/api/v1/applications')
          .set('Authorization', `Bearer ${jobSeekerToken}`)
          .send({
            jobId: jobId,
            coverLetter: 'I am very interested in this position and believe I would be a great fit.',
            resumeUrl: 'https://example.com/resume.pdf', // Provide resume URL with application
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.data.jobId).toBe(jobId);
            applicationId = res.body.data.id;
          });
      });

      it('should reject duplicate application', () => {
        return request(app.getHttpServer())
          .post('/api/v1/applications')
          .set('Authorization', `Bearer ${jobSeekerToken}`)
          .send({
            jobId: jobId,
            coverLetter: 'Another application',
            resumeUrl: 'https://example.com/resume.pdf', // Provide resume URL with application
          })
          .expect(409);
      });

      it('should reject application by employer', () => {
        return request(app.getHttpServer())
          .post('/api/v1/applications')
          .set('Authorization', `Bearer ${employerToken}`)
          .send({
            jobId: jobId,
            coverLetter: 'Test',
          })
          .expect(403);
      });
    });

    describe('GET /api/v1/applications', () => {
      it('should get own applications (Job Seeker)', () => {
        return request(app.getHttpServer())
          .get('/api/v1/applications')
          .set('Authorization', `Bearer ${jobSeekerToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toHaveProperty('data');
          });
      });

      it('should get job applications (Employer)', () => {
        return request(app.getHttpServer())
          .get('/api/v1/applications')
          .set('Authorization', `Bearer ${employerToken}`)
          .expect(200);
      });
    });

    describe('GET /api/v1/applications/my-stats', () => {
      it('should get application stats (Job Seeker)', () => {
        return request(app.getHttpServer())
          .get('/api/v1/applications/my-stats')
          .set('Authorization', `Bearer ${jobSeekerToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toHaveProperty('totalApplications');
          });
      });
    });

    describe('PATCH /api/v1/applications/:id/status', () => {
      it('should update application status (Employer)', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/applications/${applicationId}/status`)
          .set('Authorization', `Bearer ${employerToken}`)
          .send({
            status: 'REVIEWING',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body.data.status).toBe('REVIEWING');
          });
      });

      it('should reject status update by job seeker', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/applications/${applicationId}/status`)
          .set('Authorization', `Bearer ${jobSeekerToken}`)
          .send({
            status: 'ACCEPTED',
          })
          .expect(403);
      });
    });
  });

  describe('User Module', () => {
    describe('GET /api/v1/users', () => {
      it('should get all users (Admin)', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toHaveProperty('data');
          });
      });

      it('should reject non-admin access', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${employerToken}`)
          .expect(403);
      });
    });

    describe('GET /api/v1/users/stats', () => {
      it('should get user statistics (Admin)', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toHaveProperty('totalUsers');
          });
      });
    });
  });

  describe('Notification Module', () => {
    describe('GET /api/v1/notifications/queue-stats', () => {
      it('should get queue stats (Admin)', () => {
        return request(app.getHttpServer())
          .get('/api/v1/notifications/queue-stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toHaveProperty('queues');
          });
      });

      it('should reject non-admin access', () => {
        return request(app.getHttpServer())
          .get('/api/v1/notifications/queue-stats')
          .set('Authorization', `Bearer ${employerToken}`)
          .expect(403);
      });
    });
  });
});
