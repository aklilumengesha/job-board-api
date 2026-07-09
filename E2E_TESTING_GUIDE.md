# E2E Testing Guide

## Overview
This guide explains how to set up and run end-to-end (E2E) tests for the Job Board API. The E2E tests verify that all API endpoints work correctly together as a complete system.

## Prerequisites

Before running E2E tests, ensure you have:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** database running
3. **Redis** server running (for cache and queue services)
4. All npm dependencies installed: `npm install`

## Database Setup

### Option 1: Use a Separate Test Database (Recommended)

1. Create a test database in PostgreSQL:
```sql
CREATE DATABASE jobboard_test;
```

2. Create a `.env.test` file in the project root:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jobboard_test?schema=public"
JWT_SECRET="test-jwt-secret-for-testing-only"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="test-refresh-token-secret"
REFRESH_TOKEN_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="test"
API_PREFIX="api/v1"
EMAIL_PROVIDER="nodemailer"
EMAIL_FROM="test@example.com"
EMAIL_FROM_NAME="Test Job Board"
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="test@example.com"
SMTP_PASSWORD="test-password"
STORAGE_PROVIDER="local"
UPLOAD_PATH="./test-uploads"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=1
```

3. Run Prisma migrations on the test database:
```bash
npx dotenv -e .env.test -- npx prisma migrate deploy
```

### Option 2: Use Docker for Test Database

Create a `docker-compose.test.yml`:

```yaml
version: '3.8'

services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: jobboard_test
    ports:
      - "5433:5432"
    volumes:
      - test_postgres_data:/var/lib/postgresql/data

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"

volumes:
  test_postgres_data:
```

Start the test containers:
```bash
docker-compose -f docker-compose.test.yml up -d
```

Update `.env.test` with Docker database URL:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/jobboard_test?schema=public"
REDIS_PORT=6380
```

## Running E2E Tests

### 1. Prepare the Test Database

Before each test run, reset the database to a clean state:

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jobboard_test?schema=public"; npx prisma migrate reset --force --skip-seed

# Linux/Mac
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jobboard_test?schema=public" npx prisma migrate reset --force --skip-seed
```

### 2. Run the E2E Tests

```bash
npm run test:e2e
```

### 3. Run with Coverage

```bash
npm run test:e2e -- --coverage
```

### 4. Run Specific Test Suite

```bash
npm run test:e2e -- --testNamePattern="Authentication Module"
```

### 5. Watch Mode (for development)

```bash
npm run test:e2e -- --watch
```

## Test Structure

The E2E test suite (`test/app.e2e-spec.ts`) covers:

### 1. **Health Check**
- API availability check

### 2. **Authentication Module**
- User registration (Job Seeker, Employer, Admin)
- User login
- Token refresh
- Get current user
- Duplicate email validation

### 3. **Company Module**
- Create company profile (Employer only)
- Get all companies (Public)
- Get own company
- Update company
- Authorization checks

### 4. **Category Module**
- Create category (Admin only)
- Get all categories (Public)
- Get popular categories
- Update/delete categories
- Authorization checks

### 5. **Job Module**
- Create job posting (Employer only)
- Get all jobs with pagination (Public)
- Search and filter jobs
- Get job by ID
- Get employer's jobs
- Job statistics
- Authorization checks

### 6. **Application Module**
- Apply for job (Job Seeker only)
- Get own applications
- Get applications for employer's jobs
- Update application status (Employer only)
- Application statistics
- Duplicate application validation
- Authorization checks

### 7. **User Module**
- Get all users (Admin only)
- Get user statistics
- Authorization checks

### 8. **Notification Module**
- Get queue statistics (Admin only)
- Queue management
- Authorization checks

## Test Data Flow

The tests follow a logical flow that mimics real-world usage:

```
1. Register users (Job Seeker, Employer, Admin)
   ↓
2. Employer creates company profile
   ↓
3. Admin creates job categories
   ↓
4. Employer posts jobs
   ↓
5. Job Seeker applies for jobs
   ↓
6. Employer reviews and updates application status
   ↓
7. Admin monitors system statistics
```

## Test Tokens and IDs

The test suite automatically stores and reuses:
- Access tokens for each user role
- User IDs
- Company ID
- Category ID
- Job ID
- Application ID

This ensures tests are properly chained and realistic.

## Common Issues and Solutions

### Issue 1: Database Connection Failed

**Error:** `P1000: Authentication failed against database server`

**Solution:**
- Verify PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
- Check credentials in `.env.test`
- Ensure the database exists: `createdb jobboard_test`

### Issue 2: Redis Connection Failed

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
- Start Redis server: `redis-server` (Linux/Mac) or via Redis Desktop Manager (Windows)
- Or use Docker: `docker run -p 6379:6379 redis:7-alpine`

### Issue 3: Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
- Change PORT in `.env.test` to a different port (e.g., 3001)
- Or kill the process using the port

### Issue 4: Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
npx prisma generate
```

### Issue 5: Migration Failed

**Error:** `P3005: The database schema is not empty`

**Solution:**
```bash
npx prisma migrate reset --force
npx prisma migrate dev
```

## Best Practices

### 1. Isolate Test Data
- Always use a separate test database
- Reset database before each test run
- Use unique test data (e.g., `test@example.com`)

### 2. Run Tests in CI/CD
Add to GitHub Actions (`.github/workflows/test.yml`):

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: jobboard_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/jobboard_test
      
      - run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/jobboard_test
          REDIS_HOST: localhost
          JWT_SECRET: test-secret
          REFRESH_TOKEN_SECRET: test-refresh-secret
```

### 3. Monitor Test Performance
- Keep E2E tests fast (< 30 seconds total)
- Use database transactions where possible
- Clean up test data after each suite

### 4. Test Coverage Goals
- **Authentication:** 100% - Critical security functionality
- **Authorization:** 100% - Ensure proper access control
- **Business Logic:** 80%+ - Core features work correctly
- **Edge Cases:** Cover major error scenarios

## Manual Testing Checklist

Before considering the API production-ready, manually verify:

- [ ] All authentication flows work
- [ ] File uploads (resume, company logo) work
- [ ] Email notifications are sent
- [ ] Search and filtering return correct results
- [ ] Pagination works correctly
- [ ] Authorization prevents unauthorized access
- [ ] Error messages are clear and helpful
- [ ] API documentation (Swagger) is accurate
- [ ] Rate limiting works
- [ ] CORS is configured correctly

## Next Steps

After E2E tests pass:

1. **Add Unit Tests** - Test individual services in isolation
2. **Add Integration Tests** - Test module interactions
3. **Performance Testing** - Load test with tools like k6 or Artillery
4. **Security Testing** - Run OWASP ZAP or similar tools
5. **API Documentation** - Verify Swagger docs are complete

## Test Results Interpretation

### Success Output
```
 PASS  test/app.e2e-spec.ts
  Job Board API (e2e)
    Health Check
      ✓ / (GET) - Should return Hello (45 ms)
    Authentication Module
      POST /api/v1/auth/register
        ✓ should register a job seeker (234 ms)
        ✓ should register an employer (187 ms)
        ✓ should register an admin (165 ms)
        ✓ should reject duplicate email (89 ms)
    ...
  
Test Suites: 1 passed, 1 total
Tests:       35 passed, 35 total
Time:        12.345 s
```

### Failure Analysis
When tests fail, check:
1. **Status code mismatch** - API returning different status than expected
2. **Data validation** - Required fields missing or invalid format
3. **Authorization** - Token expired or wrong role
4. **Database state** - Test data not cleaned up properly

## Support

For issues or questions:
- Check the main README.md
- Review POSTMAN_TESTING_GUIDE.md for manual testing
- Open an issue on GitHub

## Summary

The E2E test suite provides comprehensive coverage of all API endpoints and ensures the system works correctly as a whole. Run these tests regularly during development and before deployment to catch integration issues early.

**Quick Start:**
```bash
# 1. Setup test database
createdb jobboard_test

# 2. Run migrations
npx prisma migrate dev

# 3. Run tests
npm run test:e2e
```
