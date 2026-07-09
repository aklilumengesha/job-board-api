# Job Board API

A production-ready RESTful API for a job board application built with NestJS, Prisma, and PostgreSQL. Features comprehensive authentication, role-based authorization, and full CRUD operations for jobs, applications, and company profiles.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens, role-based access control (JOB_SEEKER, EMPLOYER, ADMIN)
- **User Management**: Complete user profiles with password management and account controls
- **Company Profiles**: Employer company management with logo uploads and search
- **Job Postings**: Advanced job search with 8+ filters, view tracking, and similar job suggestions
- **Applications**: Job application workflow with 5-status system and resume management
- **Categories**: Job categorization with popular categories and caching
- **Notifications**: Email notifications with BullMQ queue processing
- **Infrastructure**: Redis caching, file storage (local/S3), email service (SendGrid/SMTP)

## 📋 Tech Stack

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT + Passport
- **Caching**: Redis
- **Queue**: BullMQ
- **Email**: SendGrid / Nodemailer
- **Storage**: Local / AWS S3
- **Testing**: Jest + Supertest
- **Documentation**: Swagger/OpenAPI

## 🏗️ Architecture

Clean Architecture with 4 layers:
- **Common**: Enums, DTOs, decorators, guards, pipes, helpers
- **Core**: Database, logging, filters, interceptors
- **Infrastructure**: Cache, queue, email, storage services
- **Modules**: Business logic (Auth, User, Job, Application, etc.)

## 📦 Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

## 🔧 Configuration

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT
JWT_SECRET="your-secret-key"
REFRESH_TOKEN_SECRET="your-refresh-secret"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Email (SendGrid or SMTP)
EMAIL_PROVIDER="nodemailer"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-password"

# Storage
STORAGE_PROVIDER="local"
UPLOAD_PATH="./uploads"

# Application
PORT=3000
NODE_ENV="development"
```

## 🚀 Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Watch mode
npm run start:dev
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

**Test Results**: 37/37 E2E tests passing ✅

## 📚 API Documentation

Once running, access Swagger documentation at:
```
http://localhost:3000/api
```

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/verify-email` - Verify email
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

### Users
- `GET /api/v1/users` - Get all users (Admin)
- `GET /api/v1/users/:id` - Get user by ID
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `PATCH /api/v1/users/:id/change-password` - Change password
- `GET /api/v1/users/stats` - Get user statistics (Admin)

### Companies
- `POST /api/v1/companies` - Create company (Employer)
- `GET /api/v1/companies` - Get all companies
- `GET /api/v1/companies/:id` - Get company by ID
- `GET /api/v1/companies/my-company` - Get own company
- `PATCH /api/v1/companies/:id` - Update company
- `DELETE /api/v1/companies/:id` - Delete company
- `POST /api/v1/companies/:id/logo` - Upload company logo
- `GET /api/v1/companies/search` - Search companies

### Jobs
- `POST /api/v1/jobs` - Create job (Employer)
- `GET /api/v1/jobs` - Get all jobs with filters
- `GET /api/v1/jobs/:id` - Get job by ID
- `PATCH /api/v1/jobs/:id` - Update job
- `DELETE /api/v1/jobs/:id` - Delete job
- `GET /api/v1/jobs/my-jobs` - Get employer's jobs
- `GET /api/v1/jobs/stats` - Get job statistics
- `GET /api/v1/jobs/:id/similar` - Get similar jobs
- `POST /api/v1/jobs/:id/view` - Track job view

### Applications
- `POST /api/v1/applications` - Apply for job (Job Seeker)
- `GET /api/v1/applications` - Get applications
- `GET /api/v1/applications/:id` - Get application by ID
- `PATCH /api/v1/applications/:id/status` - Update status (Employer)
- `DELETE /api/v1/applications/:id` - Withdraw application
- `GET /api/v1/applications/my-stats` - Get application stats
- `GET /api/v1/applications/job/:jobId` - Get job applications (Employer)

### Categories
- `POST /api/v1/categories` - Create category (Admin)
- `GET /api/v1/categories` - Get all categories
- `GET /api/v1/categories/:id` - Get category by ID
- `PATCH /api/v1/categories/:id` - Update category (Admin)
- `DELETE /api/v1/categories/:id` - Delete category (Admin)
- `GET /api/v1/categories/popular` - Get popular categories

### Notifications
- `GET /api/v1/notifications/queue-stats` - Get queue stats (Admin)
- `POST /api/v1/notifications/retry-failed` - Retry failed jobs (Admin)
- `POST /api/v1/notifications/clean-queue` - Clean queue (Admin)

## 🔐 Authentication Flow

1. Register: `POST /api/v1/auth/register`
2. Verify Email: Click link in email
3. Login: `POST /api/v1/auth/login` (returns accessToken + refreshToken)
4. Use accessToken in Authorization header: `Bearer {token}`
5. Refresh token when expired: `POST /api/v1/auth/refresh`

## 👥 User Roles

- **JOB_SEEKER**: Can apply for jobs, manage applications, update profile
- **EMPLOYER**: Can post jobs, manage company profile, review applications
- **ADMIN**: Full access to all resources, user management, system stats

## 📊 Database Schema

### Core Models
- **User**: Base user information and authentication
- **JobSeeker**: Job seeker profile with resume and skills
- **Employer**: Employer profile linked to company
- **Company**: Company information and branding
- **Job**: Job postings with requirements and salary
- **Application**: Job applications with status tracking
- **Category**: Job categories for organization
- **SavedJob**: Bookmarked jobs for job seekers

## 🛠️ Development

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed database
npx prisma db seed

# View database
npx prisma studio

# Format code
npm run format

# Lint code
npm run lint
```

## 📦 Build

```bash
# Build for production
npm run build

# The build output will be in ./dist
```

## 🐳 Docker (Optional)

```bash
# Build image
docker build -t job-board-api .

# Run container
docker run -p 3000:3000 job-board-api
```

## 🔄 CI/CD

The project includes E2E tests that can be integrated into CI/CD pipelines. Tests use mock services for Redis, email, and queue to run without external dependencies.

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for access tokens | Yes |
| `REFRESH_TOKEN_SECRET` | Secret for refresh tokens | Yes |
| `REDIS_HOST` | Redis host | Yes |
| `REDIS_PORT` | Redis port | Yes |
| `EMAIL_PROVIDER` | Email service (sendgrid/nodemailer) | Yes |
| `STORAGE_PROVIDER` | Storage service (local/s3) | Yes |
| `PORT` | Application port | No (default: 3000) |
| `NODE_ENV` | Environment (development/production) | No |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🔗 Links

- **Repository**: https://github.com/aklilumengesha/job-board-api.git
- **Documentation**: http://localhost:3000/api (when running)
- **Issues**: https://github.com/aklilumengesha/job-board-api/issues

## ✨ Status

- ✅ All 37 E2E tests passing
- ✅ Clean Architecture implemented
- ✅ TypeScript strict mode
- ✅ Production ready
- ✅ Fully documented API

## 📞 Support

For questions or issues, please open an issue on GitHub.

---

**Built with ❤️ using NestJS**
