# Job Board API - Setup Guide

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18.x or higher
- **PostgreSQL** v14.x or higher
- **npm** or **yarn**
- **Git**

## 🔧 Step-by-Step Setup

### 1. Install Node.js Dependencies

```bash
cd job-board-api
npm install
```

### 2. Set Up PostgreSQL Database

#### Option A: Local PostgreSQL Installation

```bash
# Install PostgreSQL (Windows)
# Download from https://www.postgresql.org/download/windows/

# Create database
psql -U postgres
CREATE DATABASE jobboard_db;
\q
```

#### Option B: Docker PostgreSQL

```bash
docker run --name jobboard-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=jobboard_db \
  -p 5432:5432 \
  -d postgres:14
```

### 3. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jobboard_db?schema=public"
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="your-refresh-secret-here"
REFRESH_TOKEN_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
```

### 4. Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# View database in Prisma Studio (optional)
npx prisma studio
```

### 5. Seed Database with Sample Data

```bash
npm run prisma:seed
```

This will create:
- Admin user
- Sample categories
- Sample employers
- Sample jobs
- Sample job seekers

### 6. Start Development Server

```bash
npm run start:dev
```

The API will be running at `http://localhost:3000`

### 7. Access API Documentation

Open your browser and navigate to:

```
http://localhost:3000/api/docs
```

## 🧪 Testing the API

### Test Authentication

```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "firstName": "John",
    "lastName": "Doe",
    "role": "JOB_SEEKER"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### Test Job Listing

```bash
# Get all jobs
curl http://localhost:3000/api/v1/jobs

# Search jobs
curl "http://localhost:3000/api/v1/jobs?search=developer&location=New York"
```

## 🔑 Default Credentials (After Seeding)

### Admin User
- Email: `admin@jobboard.com`
- Password: `Admin123!@#`

### Sample Employer
- Email: `employer@techcorp.com`
- Password: `Employer123!@#`

### Sample Job Seeker
- Email: `jobseeker@example.com`
- Password: `JobSeeker123!@#`

## 📊 Database Management

### View Database in Prisma Studio

```bash
npx prisma studio
```

### Reset Database

```bash
npx prisma migrate reset
```

### Create New Migration

```bash
npx prisma migrate dev --name migration_name
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in .env
PORT=3001
```

### Database Connection Failed

1. Check PostgreSQL is running
2. Verify DATABASE_URL in .env
3. Check firewall settings
4. Verify database exists

```bash
psql -U postgres -l
```

### Prisma Client Not Generated

```bash
npx prisma generate
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📧 Email Configuration

### Development (Nodemailer with Gmail)

1. Enable "Less secure app access" in Gmail
2. Update .env:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-password"
```

### Production (SendGrid)

1. Sign up at https://sendgrid.com
2. Get API key
3. Update .env:

```env
SENDGRID_API_KEY="your-sendgrid-key"
EMAIL_FROM="noreply@yourdomain.com"
```

## 📤 File Upload Configuration

### Local Storage (Development)

Files are stored in `./uploads/` directory by default.

### AWS S3 (Production)

1. Create S3 bucket
2. Create IAM user with S3 access
3. Update .env:

```env
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_S3_BUCKET="your-bucket"
AWS_REGION="us-east-1"
```

## 🚀 Production Setup

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run start:prod
```

### Environment Variables for Production

- Set `NODE_ENV="production"`
- Use strong JWT secrets
- Configure proper CORS
- Set up SSL/TLS
- Configure production database
- Set up monitoring and logging

## 📝 Next Steps

1. ✅ Complete initial setup
2. ✅ Test API endpoints
3. 📱 Build frontend application
4. 🔐 Implement additional security
5. 🧪 Write comprehensive tests
6. 🚀 Deploy to production
7. 📊 Set up monitoring
8. 📧 Configure email templates

## 🆘 Getting Help

- Check [README.md](../README.md) for overview
- See [PRD.md](../PRD.md) for requirements
- View [FOLDER_STRUCTURE.md](../FOLDER_STRUCTURE.md) for structure
- Open an issue on GitHub

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
