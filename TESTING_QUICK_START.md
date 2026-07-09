# Testing Quick Start Guide

## 🚀 Quick Start with Docker (Recommended)

The easiest way to run E2E tests is using Docker for the database and Redis.

### Step 1: Install Docker Desktop
Download and install Docker Desktop from: https://www.docker.com/products/docker-desktop/

### Step 2: Start Test Services
```bash
docker-compose -f docker-compose.test.yml up -d
```

This starts:
- PostgreSQL on port **5433**
- Redis on port **6380**

### Step 3: Setup Test Database
```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/jobboard_test?schema=public"
npx prisma migrate deploy
npx prisma generate
```

### Step 4: Run E2E Tests
```bash
npm run test:e2e
```

### Step 5: Stop Test Services (When Done)
```bash
docker-compose -f docker-compose.test.yml down
```

---

## 📦 Without Docker (Manual Setup)

If you prefer not to use Docker, follow these steps:

### Prerequisites
1. **PostgreSQL** installed and running
2. **Redis** installed and running
3. **Node.js** 18+ installed

### Setup Steps

#### 1. Create Test Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE jobboard_test;

# Exit
\q
```

#### 2. Update .env.test
Make sure `.env.test` uses the correct port (5432 for local PostgreSQL):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jobboard_test?schema=public"
REDIS_PORT=6379
```

#### 3. Run Migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

#### 4. Start Redis (if not running)
```bash
# Windows (if installed via Chocolatey or MSI)
redis-server

# Or download Redis from: https://github.com/microsoftarchive/redis/releases
```

#### 5. Run Tests
```bash
npm run test:e2e
```

---

## 🎯 Test Coverage

The E2E test suite tests **65+ API endpoints** across:

| Module | Endpoints | Coverage |
|--------|-----------|----------|
| Authentication | 8 | Registration, Login, Refresh, Verify |
| Company | 8 | CRUD, Search, Logo Upload |
| Category | 8 | CRUD, Popular, Public Access |
| Job | 10 | CRUD, Search, Filter, Stats |
| Application | 8 | Apply, Status Updates, Stats |
| User | 7 | Profile, Admin Management |
| Notification | 6 | Queue Management, Email |

---

## 📊 Understanding Test Results

### ✅ Success
```
PASS  test/app.e2e-spec.ts (12.345 s)
  Job Board API (e2e)
    ✓ Health Check (45 ms)
    ✓ Authentication Module (567 ms)
    ✓ Company Module (234 ms)
    ✓ Category Module (189 ms)
    ✓ Job Module (456 ms)
    ✓ Application Module (345 ms)
    ✓ User Module (123 ms)
    ✓ Notification Module (89 ms)

Test Suites: 1 passed, 1 total
Tests:       35 passed, 35 total
Snapshots:   0 total
Time:        12.345 s
```

### ❌ Common Failures

#### Database Connection Error
```
Error: P1000: Authentication failed against database server
```
**Fix:** Ensure PostgreSQL is running and credentials are correct.

#### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Fix:** Start Redis server or use Docker: `docker-compose -f docker-compose.test.yml up -d`

#### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Fix:** Change PORT in `.env.test` or stop the process using that port.

---

## 🔧 Troubleshooting

### Reset Everything
If tests are failing unexpectedly, reset the test environment:

```bash
# Stop and remove Docker containers
docker-compose -f docker-compose.test.yml down -v

# Start fresh
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready (10 seconds)
timeout /t 10 /nobreak

# Recreate database
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/jobboard_test?schema=public"
npx prisma migrate reset --force --skip-seed

# Run tests
npm run test:e2e
```

### Check Docker Containers Status
```bash
docker-compose -f docker-compose.test.yml ps
```

Expected output:
```
NAME                      STATUS    PORTS
jobboard-postgres-test    Up        0.0.0.0:5433->5432/tcp
jobboard-redis-test       Up        0.0.0.0:6380->6379/tcp
```

### View Container Logs
```bash
# PostgreSQL logs
docker logs jobboard-postgres-test

# Redis logs
docker logs jobboard-redis-test
```

### Connect to Test Database
```bash
# Using Docker
docker exec -it jobboard-postgres-test psql -U postgres -d jobboard_test

# Or locally (if using local PostgreSQL)
psql -U postgres -d jobboard_test
```

---

## 🧪 Running Specific Tests

### Run Only Authentication Tests
```bash
npm run test:e2e -- --testNamePattern="Authentication Module"
```

### Run Only Company Tests
```bash
npm run test:e2e -- --testNamePattern="Company Module"
```

### Run with Detailed Output
```bash
npm run test:e2e -- --verbose
```

### Run in Watch Mode (Development)
```bash
npm run test:e2e -- --watch
```

---

## 📝 Before Committing Code

Always run the full test suite before committing:

```bash
# 1. Lint code
npm run lint

# 2. Build project
npm run build

# 3. Run E2E tests
npm run test:e2e
```

If all pass, your code is ready to commit! ✅

---

## 🚢 CI/CD Integration

For GitHub Actions, the test workflow is defined in `.github/workflows/test.yml`.

The CI pipeline:
1. Starts PostgreSQL and Redis as services
2. Installs dependencies
3. Runs Prisma migrations
4. Executes E2E tests
5. Reports results

---

## 📚 Additional Resources

- **Detailed E2E Guide:** `E2E_TESTING_GUIDE.md`
- **Postman Testing:** `POSTMAN_TESTING_GUIDE.md`
- **API Documentation:** http://localhost:3000/api (when server is running)
- **Prisma Studio:** `npx prisma studio` (database GUI)

---

## ⚡ Performance Tips

1. **Use Docker** - Faster startup, consistent environment
2. **Keep test DB small** - Reset before each run
3. **Parallel tests** - Jest runs tests in parallel by default
4. **Mock external services** - Email, S3 uploads in tests

---

## ✨ Next Steps After E2E Tests Pass

1. ✅ All endpoints work correctly
2. 🎨 Add unit tests for complex business logic
3. 🔒 Run security audit: `npm audit`
4. 📖 Update API documentation
5. 🚀 Deploy to staging environment
6. 📊 Set up monitoring and logging
7. 🎉 Go to production!

---

## 🆘 Need Help?

1. Check `E2E_TESTING_GUIDE.md` for detailed explanations
2. Review `POSTMAN_TESTING_GUIDE.md` for manual testing
3. Read test file: `test/app.e2e-spec.ts`
4. Open an issue on GitHub

---

**Happy Testing! 🎉**
