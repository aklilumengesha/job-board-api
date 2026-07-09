import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

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
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/ (GET) - Should return Hello', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('Authentication Module', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should register a job seeker', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'jobseeker-test@example.com',
            password: 'Password123!',
            firstName: 'John',
            lastName: 'Doe',
            role: 'JOB_SEEKER',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            expect(res.body.user.role).toBe('JOB_SEEKER');
            jobSeekerId = res.body.user.id;
            jobSeekerToken = res.body.accessToken;
          });
      });

      it('should register an employer', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'employer-test@example.com',
            password: 'Password123!',
            firstName: 'Jane',
            lastName: 'Smith',
            role: 'EMPLOYER',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.user.role).toBe('EMPLOYER');
            employerId = res.body.user.id;
            employerToken = res.body.accessToken;
          });
      });

      it('should register an admin', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'admin-test@example.com',
            password: 'Password123!',
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.user.role).toBe('ADMIN');
            adminToken = res.body.accessToken;
          });
      });

      it('should reject duplicate email', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            email: 'jobseeker-test@example.com',
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'JOB_SEEKER',
          })
          .expect(409);
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login successfully', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'employer-test@example.com',
            password: 'Password123!',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('accessToken');
            employerToken = res.body.accessToken;
          });
      });

      it('should reject invalid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'employer-test@example.com',
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
            expect(res.body.email).toBe('employer-test@example.com');
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
      it('should create company profile (Employer)', () => {
        return request(app.getHttpServer())
          .post('/api/v1/companies')
          .set('Authorization', `Bearer ${employerToken}`)
          .send({
            companyName: 'Test Company Inc',
            description: 'A test company for E2E testing',
            website: 'https://testcompany.com',
            location: 'Test City',
            industry: 'Technology',
            icon: '💻',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.companyName).toBe('Test Company Inc');
            companyId = res.body.id;
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
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
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
            expect(res.body.id).toBe(companyId);
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
            name: 'Software Development',
            description: 'Jobs related to software development',
            icon: '💻',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.name).toBe('Software Development');
            categoryId = res.body.id;
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
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
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
            expect(res.body.title).toBe('Test Senior Developer');
            jobId = res.body.id;
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
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('total');
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
            expect(res.body.id).toBe(jobId);
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
            expect(res.body).toHaveProperty('totalJobs');
          });
      });
    });
  });

  describe('Application Module', () => {
    describe('POST /api/v1/applications', () => {
      it('should apply for job (Job Seeker)', () => {
        return request(app.getHttpServer())
          .post('/api/v1/applications')
          .set('Authorization', `Bearer ${jobSeekerToken}`)
          .send({
            jobId: jobId,
            coverLetter: 'I am very interested in this position and believe I would be a great fit.',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.jobId).toBe(jobId);
            applicationId = res.body.id;
          });
      });

      it('should reject duplicate application', () => {
        return request(app.getHttpServer())
          .post('/api/v1/applications')
          .set('Authorization', `Bearer ${jobSeekerToken}`)
          .send({
            jobId: jobId,
            coverLetter: 'Another application',
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
            expect(res.body).toHaveProperty('data');
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
            expect(res.body).toHaveProperty('totalApplications');
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
            expect(res.body.status).toBe('REVIEWING');
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
            expect(res.body).toHaveProperty('data');
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
            expect(res.body).toHaveProperty('totalUsers');
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
            expect(res.body).toHaveProperty('queues');
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
