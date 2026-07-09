# How to Run Tests - Simple Guide

## 🚀 Easiest Way (Docker)

### Step 1: Install Docker Desktop
Download from: https://www.docker.com/products/docker-desktop/

### Step 2: Open PowerShell in the Project Directory
```powershell
cd C:\portfolio\job-board-api
```

### Step 3: Run These Commands
```powershell
# Start test database and Redis
docker-compose -f docker-compose.test.yml up -d

# Wait 10 seconds for services to start
Start-Sleep -Seconds 10

# Setup test database
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/jobboard_test?schema=public"
npx prisma migrate deploy

# Run tests
npm run test:e2e
```

### Step 4: View Results
You should see something like:
```
PASS  test/app.e2e-spec.ts
  ✓ Health Check
  ✓ Authentication Module (8 tests)
  ✓ Company Module (5 tests)
  ✓ Category Module (5 tests)
  ✓ Job Module (7 tests)
  ✓ Application Module (8 tests)
  ✓ User Module (3 tests)
  ✓ Notification Module (2 tests)

Test Suites: 1 passed, 1 total
Tests:       35 passed, 35 total
Time:        12.345 s
```

### Step 5: Stop Docker Services (When Done)
```powershell
docker-compose -f docker-compose.test.yml down
```

---

## 🛠️ Without Docker (Manual Setup)

### Prerequisites
1. PostgreSQL installed and running
2. Redis installed and running

### Steps
```powershell
# 1. Create test database
psql -U postgres -c "CREATE DATABASE jobboard_test;"

# 2. Run migrations
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jobboard_test?schema=public"
npx prisma migrate deploy

# 3. Run tests
npm run test:e2e
```

---

## 📝 What the Tests Check

The E2E tests verify:

✅ **Authentication** - Register, login, token refresh
✅ **Authorization** - Role-based access control
✅ **Company Management** - Create and manage company profiles
✅ **Job Posting** - Create, search, filter jobs
✅ **Applications** - Apply, review, update status
✅ **Admin Features** - User management, statistics
✅ **Notifications** - Queue management

---

## 🔧 Troubleshooting

### Problem: "Docker is not recognized"
**Solution:** Install Docker Desktop from https://www.docker.com/products/docker-desktop/

### Problem: "Database connection failed"
**Solution:** Make sure Docker containers are running:
```powershell
docker ps
```
You should see:
- jobboard-postgres-test
- jobboard-redis-test

### Problem: "Port 5433 is already in use"
**Solution:** Stop conflicting services:
```powershell
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d
```

### Problem: Tests fail with errors
**Solution:** Reset everything:
```powershell
# Stop containers
docker-compose -f docker-compose.test.yml down -v

# Start fresh
docker-compose -f docker-compose.test.yml up -d
Start-Sleep -Seconds 10

# Recreate database
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/jobboard_test?schema=public"
npx prisma migrate reset --force --skip-seed

# Run tests
npm run test:e2e
```

---

## 📚 More Information

- **Quick Start Guide:** `TESTING_QUICK_START.md`
- **Detailed Guide:** `E2E_TESTING_GUIDE.md`
- **Summary:** `E2E_TESTS_COMPLETE.md`

---

## ⚡ Quick Commands

```powershell
# Check prerequisites
.\scripts\check-test-prerequisites.bat

# Start Docker services
docker-compose -f docker-compose.test.yml up -d

# Run tests
npm run test:e2e

# Run tests with detailed output
npm run test:e2e:verbose

# Stop Docker services
docker-compose -f docker-compose.test.yml down
```

---

**That's it! Happy testing! 🎉**
