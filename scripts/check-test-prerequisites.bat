@echo off
REM Check Test Prerequisites Script

echo ========================================
echo Job Board API - Test Prerequisites Check
echo ========================================
echo.

set ALL_OK=1

REM Check Node.js
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] Node.js is not installed or not in PATH
    echo   Download from: https://nodejs.org/
    set ALL_OK=0
) else (
    node --version
    echo   [OK] Node.js found
)
echo.

REM Check npm
echo [2/5] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] npm is not installed
    set ALL_OK=0
) else (
    npm --version
    echo   [OK] npm found
)
echo.

REM Check Docker
echo [3/5] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo   [WARN] Docker is not installed (optional but recommended)
    echo   Download from: https://www.docker.com/products/docker-desktop/
) else (
    docker --version
    echo   [OK] Docker found
)
echo.

REM Check PostgreSQL (optional if using Docker)
echo [4/5] Checking PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo   [WARN] PostgreSQL CLI not found (OK if using Docker)
) else (
    psql --version
    echo   [OK] PostgreSQL CLI found
)
echo.

REM Check Redis (optional if using Docker)
echo [5/5] Checking Redis...
redis-cli --version >nul 2>&1
if errorlevel 1 (
    echo   [WARN] Redis CLI not found (OK if using Docker)
) else (
    redis-cli --version
    echo   [OK] Redis CLI found
)
echo.

REM Check if node_modules exist
echo [BONUS] Checking node_modules...
if not exist "node_modules\" (
    echo   [WARN] node_modules not found. Run: npm install
    set ALL_OK=0
) else (
    echo   [OK] node_modules found
)
echo.

echo ========================================
echo Summary
echo ========================================
echo.

if %ALL_OK%==1 (
    echo [SUCCESS] All required prerequisites are met!
    echo.
    echo Next steps:
    echo   1. Start test services: docker-compose -f docker-compose.test.yml up -d
    echo   2. Run tests: npm run test:e2e
) else (
    echo [ACTION REQUIRED] Some prerequisites are missing.
    echo Please install the missing components and try again.
)

echo.
echo For detailed setup instructions, see: TESTING_QUICK_START.md
echo.
pause
