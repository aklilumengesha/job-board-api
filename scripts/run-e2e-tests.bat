@echo off
REM Run E2E Tests Script for Windows

echo ========================================
echo Job Board API - E2E Test Runner
echo ========================================
echo.

echo Checking prerequisites...
echo.

REM Check if PostgreSQL is accessible
psql -U postgres -c "SELECT 1" > nul 2>&1
if errorlevel 1 (
    echo WARNING: PostgreSQL is not accessible!
    echo Please ensure PostgreSQL is running on localhost:5432
    echo.
    echo Run: scripts\setup-test-db.bat first
    echo.
    pause
    exit /b 1
)

REM Check if test database exists
psql -U postgres -lqt | find "jobboard_test" > nul 2>&1
if errorlevel 1 (
    echo Test database not found. Creating it now...
    call scripts\setup-test-db.bat
)

echo Prerequisites OK!
echo.

echo Resetting test database to clean state...
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobboard_test?schema=public
npx prisma migrate reset --force --skip-seed

if errorlevel 1 (
    echo.
    echo ERROR: Failed to reset database!
    pause
    exit /b 1
)

echo.
echo Running E2E tests...
echo.

npm run test:e2e

if errorlevel 1 (
    echo.
    echo ========================================
    echo TESTS FAILED!
    echo ========================================
    echo.
    echo Check the error messages above for details.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ALL TESTS PASSED!
echo ========================================
echo.
pause
