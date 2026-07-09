# Job Board API

A scalable RESTful API backend for a job board platform built with NestJS, PostgreSQL, and Prisma.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Job Management**: Post, search, filter, and manage job listings
- **Application Tracking**: Apply to jobs and track application status
- **User Profiles**: Separate profiles for job seekers and employers
- **File Uploads**: Resume and company logo uploads
- **Email Notifications**: Automated email notifications for key events
- **Search & Filtering**: Advanced job search with multiple filters
- **API Documentation**: Swagger/OpenAPI documentation

## 🛠️ Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Passport.js
- **File Storage**: Local (development) / AWS S3 (production)
- **Email**: SendGrid / Nodemailer
- **Validation**: class-validator, class-transformer
- **Logging**: Winston
- **Testing**: Jest

## 📋 Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm or yarn
- Git

## 🔧 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd job-board-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and configure your environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/jobboard"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="your-refresh-secret"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Email
SENDGRID_API_KEY="your-sendgrid-key"
EMAIL_FROM="noreply@jobboard.com"

# Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR="./uploads"

# AWS S3 (Production)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="your-bucket-name"
AWS_REGION="us-east-1"

# App
PORT=3000
NODE_ENV="development"
```

### 4. Set up database

```bash
# Run Prisma migrations
npx prisma migrate dev

# Seed database
npx prisma db seed
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

## 🚀 Running the Application

### Development mode

```bash
npm run start:dev
```

### Production mode

```bash
npm run build
npm run start:prod
```

### Watch mode

```bash
npm run start:watch
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

Once the server is running, access the Swagger documentation at:

```
http://localhost:3000/api/docs
```

## 🧪 Testing

### Quick Start (E2E Tests with Docker)

```bash
# 1. Start test services
docker-compose -f docker-compose.test.yml up -d

# 2. Setup test database
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/jobboard_test?schema=public"
npx prisma migrate deploy

# 3. Run E2E tests
npm run test:e2e
```

### All Test Commands

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# E2E tests (verbose)
npm run test:e2e:verbose

# E2E tests (watch mode)
npm run test:e2e:watch

# Test coverage
npm run test:cov

# Docker test services
npm run docker:test:up      # Start
npm run docker:test:down    # Stop
npm run docker:test:logs    # View logs
```

### Test Documentation

- **Quick Start**: [HOW_TO_RUN_TESTS.md](./HOW_TO_RUN_TESTS.md) - Simple guide
- **Detailed Guide**: [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) - Comprehensive
- **Manual Testing**: [POSTMAN_TESTING_GUIDE.md](./POSTMAN_TESTING_GUIDE.md) - Postman guide
- **Test Summary**: [E2E_TESTS_COMPLETE.md](./E2E_TESTS_COMPLETE.md) - Overview

### Test Coverage

The E2E test suite covers **65+ API endpoints** across:
- ✅ Authentication (8 tests)
- ✅ Company Management (5 tests)
- ✅ Category Management (5 tests)
- ✅ Job Posting (7 tests)
- ✅ Application Workflow (8 tests)
- ✅ User Management (3 tests)
- ✅ Notifications (2 tests)

## 📁 Project Structure

```
src/
├── auth/              # Authentication module
├── users/             # User management
├── job-seekers/       # Job seeker profiles
├── employers/         # Employer profiles
├── jobs/              # Job listings
├── applications/      # Job applications
├── categories/        # Job categories
├── notifications/     # Notifications
├── common/            # Shared utilities
├── config/            # Configuration
├── prisma/            # Database service
├── email/             # Email service
├── upload/            # File upload
└── health/            # Health checks
```

See [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) for detailed structure.

## 🔐 Authentication

The API uses JWT tokens for authentication:

1. Register: `POST /api/v1/auth/register`
2. Login: `POST /api/v1/auth/login` - Returns access & refresh tokens
3. Use access token in Authorization header: `Bearer <token>`
4. Refresh token: `POST /api/v1/auth/refresh`

## 👥 User Roles

- **JOB_SEEKER**: Can search jobs, apply, save jobs
- **EMPLOYER**: Can post jobs, review applications
- **ADMIN**: Full system access

## 📊 Database Schema

See [PRD.md](./PRD.md) for complete database schema.

Key entities:
- User
- JobSeeker
- Employer
- Job
- Application
- Category
- SavedJob

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Jobs
- `GET /api/v1/jobs` - List jobs (with filters)
- `GET /api/v1/jobs/:id` - Get job details
- `POST /api/v1/jobs` - Create job (Employer)
- `PATCH /api/v1/jobs/:id` - Update job (Employer)
- `DELETE /api/v1/jobs/:id` - Delete job (Employer)

### Applications
- `POST /api/v1/applications` - Apply to job
- `GET /api/v1/applications` - List applications
- `PATCH /api/v1/applications/:id/status` - Update status (Employer)

See [PRD.md](./PRD.md) for complete API documentation.

## 📧 Email Templates

Email templates are located in `src/email/templates/`:
- Welcome email
- Email verification
- Password reset
- Application received
- Application status update

## 📤 File Uploads

Supported file types:
- **Resumes**: PDF, DOC, DOCX (max 5MB)
- **Logos**: JPG, PNG, WEBP (max 2MB)

Files are stored in:
- Development: `./uploads/`
- Production: AWS S3

## 🔍 Search & Filtering

Job search supports:
- Text search (title, company, skills)
- Location filter
- Job type (Full-time, Part-time, Contract, etc.)
- Experience level
- Salary range
- Category
- Pagination
- Sorting

Example:
```
GET /api/v1/jobs?search=developer&location=New York&jobType=FULL_TIME&page=1&limit=20
```

## 📝 Logging

Logs are stored in `logs/` directory:
- `error.log` - Error logs
- `combined.log` - All logs
- `access.log` - HTTP access logs

## 🏥 Health Checks

- `GET /api/v1/health` - Application health
- `GET /api/v1/health/db` - Database health

## 🚀 Deployment

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for deployment guide.

### Docker Deployment

```bash
# Build image
docker build -t job-board-api .

# Run container
docker run -p 3000:3000 job-board-api
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, email support@jobboard.com or open an issue.

## 🔗 Links

- [PRD Document](./PRD.md) - Product Requirements Document
- [Folder Structure](./FOLDER_STRUCTURE.md) - Project structure
- [Testing Quick Start](./HOW_TO_RUN_TESTS.md) - How to run tests
- [E2E Testing Guide](./E2E_TESTING_GUIDE.md) - Comprehensive test guide
- [Postman Testing](./POSTMAN_TESTING_GUIDE.md) - Manual API testing
- [API Documentation](http://localhost:3000/api/docs) - Swagger UI
