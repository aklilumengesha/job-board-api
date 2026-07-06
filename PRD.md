# Product Requirements Document (PRD)
# Job Board API - Backend System

## 📌 1. Project Overview

| Field | Details |
|-------|---------|
| **Project Name** | Job Board API |
| **Version** | 1.0.0 |
| **Purpose** | A scalable RESTful API backend for a job board platform that connects job seekers with employers, enabling job posting, application management, and user authentication. |
| **Target Users** | **Job Seekers**: Individuals searching and applying for jobs<br>**Employers**: Companies posting job listings and managing applications<br>**Admins**: Platform administrators managing users and content |

## 🎯 2. Business Objectives

### Primary Goals
- Enable seamless job posting and application process
- Provide secure authentication and authorization
- Support scalable multi-tenant architecture
- Deliver high-performance search and filtering

### Success Metrics
- API response time < 200ms for 95% of requests
- Support 10,000+ concurrent users
- 99.9% uptime
- Process 1000+ job applications per day

## 👥 3. User Roles & Permissions

### 3.1 Job Seeker
- Register and manage profile
- Search and filter jobs
- Apply to jobs with resume upload
- Track application status
- Save favorite jobs
- Receive application notifications

### 3.2 Employer
- Register company profile
- Post and manage job listings
- Review applications
- Filter and search candidates
- Manage application status
- Receive notifications for new applications

### 3.3 Admin
- Manage all users (CRUD)
- Moderate job postings
- Manage categories
- View system analytics
- Access logs and health metrics

## 🏗️ 4. System Architecture

### 4.1 Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | NestJS (TypeScript) |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Authentication** | JWT + Passport.js |
| **File Storage** | Local (uploads/) + AWS S3 (production) |
| **Email Service** | SendGrid / Nodemailer |
| **Validation** | class-validator, class-transformer |
| **Logging** | Winston |
| **Documentation** | Swagger/OpenAPI |
| **Testing** | Jest |

### 4.2 Design Patterns
- **Repository Pattern**: Separate data access from business logic
- **DTO Pattern**: Data validation and transformation
- **Service Layer**: Business logic isolation
- **Guard Pattern**: Authorization and authentication
- **Interceptor Pattern**: Logging, transformation, caching

## 📊 5. Database Schema

### 5.1 Core Entities

```prisma
// schema.prisma

model User {
  id            String        @id @default(uuid())
  email         String        @unique
  password      String
  firstName     String
  lastName      String
  role          UserRole      @default(JOB_SEEKER)
  isVerified    Boolean       @default(false)
  isActive      Boolean       @default(true)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  jobSeeker     JobSeeker?
  employer      Employer?
}

enum UserRole {
  JOB_SEEKER
  EMPLOYER
  ADMIN
}

model JobSeeker {
  id            String        @id @default(uuid())
  userId        String        @unique
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  phone         String?
  resumeUrl     String?
  skills        String[]
  experience    Int?          // Years
  location      String?
  bio           String?
  
  applications  Application[]
  savedJobs     SavedJob[]
}

model Employer {
  id            String        @id @default(uuid())
  userId        String        @unique
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyName   String
  companyLogo   String?
  website       String?
  location      String?
  description   String?
  industry      String?
  
  jobs          Job[]
}

model Job {
  id            String        @id @default(uuid())
  employerId    String
  employer      Employer      @relation(fields: [employerId], references: [id], onDelete: Cascade)
  title         String
  description   String
  requirements  String[]
  location      String
  jobType       JobType
  experienceLevel ExperienceLevel
  salaryMin     Int?
  salaryMax     Int?
  categoryId    String?
  category      Category?     @relation(fields: [categoryId], references: [id])
  status        JobStatus     @default(ACTIVE)
  views         Int           @default(0)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  expiresAt     DateTime?
  
  applications  Application[]
  savedBy       SavedJob[]
}

enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERNSHIP
  REMOTE
}

enum ExperienceLevel {
  ENTRY
  JUNIOR
  MID
  SENIOR
  LEAD
}

enum JobStatus {
  DRAFT
  ACTIVE
  CLOSED
  EXPIRED
}

model Application {
  id            String            @id @default(uuid())
  jobId         String
  job           Job               @relation(fields: [jobId], references: [id], onDelete: Cascade)
  jobSeekerId   String
  jobSeeker     JobSeeker         @relation(fields: [jobSeekerId], references: [id], onDelete: Cascade)
  coverLetter   String?
  resumeUrl     String
  status        ApplicationStatus @default(PENDING)
  appliedAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  
  @@unique([jobId, jobSeekerId])
}

enum ApplicationStatus {
  PENDING
  REVIEWING
  SHORTLISTED
  REJECTED
  ACCEPTED
}

model Category {
  id            String        @id @default(uuid())
  name          String        @unique
  description   String?
  icon          String?
  jobs          Job[]
}

model SavedJob {
  id            String        @id @default(uuid())
  jobSeekerId   String
  jobSeeker     JobSeeker     @relation(fields: [jobSeekerId], references: [id], onDelete: Cascade)
  jobId         String
  job           Job           @relation(fields: [jobId], references: [id], onDelete: Cascade)
  savedAt       DateTime      @default(now())
  
  @@unique([jobSeekerId, jobId])
}
```

## 🔌 6. API Endpoints

### 6.1 Authentication Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | Public |
| POST | `/api/v1/auth/login` | Login user | Public |
| POST | `/api/v1/auth/refresh` | Refresh access token | Public |
| POST | `/api/v1/auth/logout` | Logout user | Private |
| POST | `/api/v1/auth/forgot-password` | Request password reset | Public |
| POST | `/api/v1/auth/reset-password` | Reset password | Public |
| POST | `/api/v1/auth/verify-email` | Verify email | Public |
| GET | `/api/v1/auth/me` | Get current user | Private |

### 6.2 Users Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/users` | Get all users (admin) | Admin |
| GET | `/api/v1/users/:id` | Get user by ID | Private |
| PATCH | `/api/v1/users/:id` | Update user | Private |
| DELETE | `/api/v1/users/:id` | Delete user | Private |

### 6.3 Job Seekers Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/job-seekers/profile` | Get own profile | Job Seeker |
| PATCH | `/api/v1/job-seekers/profile` | Update profile | Job Seeker |
| POST | `/api/v1/job-seekers/upload-resume` | Upload resume | Job Seeker |
| GET | `/api/v1/job-seekers/applications` | Get my applications | Job Seeker |
| GET | `/api/v1/job-seekers/saved-jobs` | Get saved jobs | Job Seeker |

### 6.4 Employers Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/employers` | Get all employers | Public |
| GET | `/api/v1/employers/:id` | Get employer by ID | Public |
| GET | `/api/v1/employers/profile` | Get own profile | Employer |
| PATCH | `/api/v1/employers/profile` | Update profile | Employer |
| POST | `/api/v1/employers/upload-logo` | Upload company logo | Employer |

### 6.5 Jobs Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/jobs` | Get all jobs (with filters) | Public |
| GET | `/api/v1/jobs/:id` | Get job by ID | Public |
| POST | `/api/v1/jobs` | Create job | Employer |
| PATCH | `/api/v1/jobs/:id` | Update job | Employer |
| DELETE | `/api/v1/jobs/:id` | Delete job | Employer |
| GET | `/api/v1/jobs/my-jobs` | Get employer's jobs | Employer |
| POST | `/api/v1/jobs/:id/save` | Save job | Job Seeker |
| DELETE | `/api/v1/jobs/:id/unsave` | Unsave job | Job Seeker |

**Query Parameters for GET /jobs:**
```
?search=developer
&location=New York
&jobType=FULL_TIME
&categoryId=uuid
&experienceLevel=SENIOR
&salaryMin=50000
&salaryMax=100000
&page=1
&limit=20
&sortBy=createdAt
&order=DESC
```

### 6.6 Applications Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/applications` | Apply to job | Job Seeker |
| GET | `/api/v1/applications` | Get all applications | Employer |
| GET | `/api/v1/applications/:id` | Get application by ID | Private |
| PATCH | `/api/v1/applications/:id/status` | Update status | Employer |
| DELETE | `/api/v1/applications/:id` | Withdraw application | Job Seeker |

### 6.7 Categories Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/categories` | Get all categories | Public |
| GET | `/api/v1/categories/:id` | Get category by ID | Public |
| POST | `/api/v1/categories` | Create category | Admin |
| PATCH | `/api/v1/categories/:id` | Update category | Admin |
| DELETE | `/api/v1/categories/:id` | Delete category | Admin |

### 6.8 Notifications Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/notifications` | Get my notifications | Private |
| PATCH | `/api/v1/notifications/:id/read` | Mark as read | Private |
| DELETE | `/api/v1/notifications/:id` | Delete notification | Private |

### 6.9 Health Module

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/health` | Health check | Public |
| GET | `/api/v1/health/db` | Database health | Public |

## 🔒 7. Security Requirements

### 7.1 Authentication
- JWT tokens with 15-minute expiry
- Refresh tokens with 7-day expiry
- Bcrypt password hashing (cost factor: 10)
- Email verification required
- Rate limiting: 100 requests/15 minutes per IP

### 7.2 Authorization
- Role-based access control (RBAC)
- Resource ownership validation
- Guard-based permission checks

### 7.3 Data Protection
- Input validation on all endpoints
- SQL injection prevention (Prisma ORM)
- XSS protection (helmet.js)
- CORS configuration
- File upload validation (size, type)
- Environment variable encryption

### 7.4 API Security
- API versioning (`/api/v1/`)
- Request/response logging
- Error message sanitization (no stack traces in production)

## 📂 8. File Upload Requirements

### 8.1 Supported Files
- **Resumes**: PDF, DOC, DOCX (max 5MB)
- **Company Logos**: JPG, PNG, WEBP (max 2MB)

### 8.2 Storage Strategy
- **Development**: Local `uploads/` folder
- **Production**: AWS S3 with CloudFront CDN
- **File naming**: `{uuid}-{timestamp}.{ext}`
- **Virus scanning** before storage (ClamAV)

## 📧 9. Notification Requirements

### 9.1 Email Notifications

| Event | Recipient | Template |
|-------|-----------|----------|
| User registration | User | Welcome email |
| Email verification | User | Verification link |
| Password reset | User | Reset link |
| New application | Employer | Application received |
| Application status change | Job Seeker | Status update |
| Job expiring soon | Employer | Renewal reminder |

### 9.2 Email Service
- **Provider**: SendGrid (production), Nodemailer (development)
- **Template engine**: Handlebars
- **Retry logic**: 3 attempts with exponential backoff

## 🧪 10. Testing Requirements

### 10.1 Unit Tests
- **Services**: 80% coverage minimum
- **Repositories**: 90% coverage minimum
- **Utilities**: 100% coverage

### 10.2 E2E Tests
- All critical user flows
- Authentication flows
- Job application process
- Payment flows (future)

### 10.3 Test Data
- Seed scripts for development
- Faker.js for mock data generation

## 📊 11. Monitoring & Logging

### 11.1 Logging
- Winston logger with log rotation
- Log levels: ERROR, WARN, INFO, DEBUG
- Structured JSON logs
- Daily log files in `logs/` directory

### 11.2 Metrics
- API response times
- Error rates
- Database query performance
- Active user count

### 11.3 Health Checks
- `/health` endpoint for load balancers
- Database connection check
- External service availability
