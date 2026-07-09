@echo off
REM Setup Test Database Script for Windows

echo ========================================
echo Job Board API - Test Database Setup
echo ========================================
echo.

echo Step 1: Creating test database...
psql -U postgres -c "DROP DATABASE IF EXISTS jobboard_test;"
psql -U postgres -c "CREATE DATABASE jobboard_test;"

if errorlevel 1 (
    echo.
    echo ERROR: PostgreSQL is not running or not configured!
    echo.
    echo Please ensure PostgreSQL is installed and running.
    echo You can download PostgreSQL from: https://www.postgresql.org/download/windows/
    echo.
    echo Alternative: Use Docker
    echo   docker run --name postgres-test -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
    echo.
    pause
    exit /b 1
)

echo Test database created successfully!
echo.

echo Step 2: Running Prisma migrations...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobboard_test?schema=public
npx prisma migrate deploy

if errorlevel 1 (
    echo.
    echo ERROR: Migration failed!
    echo Check your DATABASE_URL and try again.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Test database setup complete!
echo ========================================
echo.
echo You can now run: npm run test:e2e
echo.
pause
