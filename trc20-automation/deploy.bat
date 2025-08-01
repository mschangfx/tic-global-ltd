@echo off
REM TRC20 Automation Service Deployment Script for Windows
REM This script automates the deployment process on Windows

echo 🚀 TRC20 Automation Service Deployment (Windows)
echo ================================================

REM Step 1: Check Prerequisites
echo.
echo Step 1: Checking Prerequisites
echo ------------------------------

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ and add it to PATH
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✓ Python found: %PYTHON_VERSION%

REM Check pip
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip is not installed
    pause
    exit /b 1
)
echo ✓ pip found

REM Step 2: Create Virtual Environment
echo.
echo Step 2: Setting up Virtual Environment
echo --------------------------------------

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo ✓ Virtual environment created
) else (
    echo ✓ Virtual environment already exists
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo ✓ Virtual environment activated

REM Step 3: Install Dependencies
echo.
echo Step 3: Installing Dependencies
echo ------------------------------

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing required packages...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ All dependencies installed successfully

REM Step 4: Environment Configuration
echo.
echo Step 4: Environment Configuration
echo --------------------------------

if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env
        echo ✓ Created .env file from template
        echo ⚠️  Please edit .env file with your actual configuration values
        echo.
        echo Required variables to configure:
        echo   - TRONGRID_API_KEY
        echo   - TRON_MAIN_WALLET_PRIVATE_KEY
        echo   - DB_HOST, DB_NAME, DB_USER, DB_PASSWORD
        echo   - SUPABASE_SERVICE_ROLE_KEY
        echo.
        echo Opening .env file in notepad...
        notepad .env
        echo.
        pause
    ) else (
        echo ❌ .env.example file not found
        pause
        exit /b 1
    )
) else (
    echo ✓ .env file already exists
)

REM Step 5: Test Database Connection
echo.
echo Step 5: Testing Database Connection
echo ----------------------------------

echo Testing database connectivity...
python -c "
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        port=int(os.getenv('DB_PORT', 5432))
    )
    conn.close()
    print('✓ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
"

if %errorlevel% neq 0 (
    echo ❌ Database connection test failed
    pause
    exit /b 1
)
echo ✓ Database connection test passed

REM Step 6: Create Service Files
echo.
echo Step 6: Creating Service Files
echo -----------------------------

REM Create startup batch file
echo @echo off > start.bat
echo cd /d "%%~dp0" >> start.bat
echo call venv\Scripts\activate.bat >> start.bat
echo python main.py >> start.bat
echo pause >> start.bat

echo ✓ Startup script created: start.bat

REM Create stop batch file
echo @echo off > stop.bat
echo taskkill /f /im python.exe >> stop.bat
echo echo TRC20 automation service stopped >> stop.bat
echo pause >> stop.bat

echo ✓ Stop script created: stop.bat

REM Step 7: Test Run
echo.
echo Step 7: Testing Service
echo ----------------------

echo Running a quick test of the service...
timeout /t 5 /nobreak >nul
start /b python main.py
timeout /t 5 /nobreak >nul
taskkill /f /im python.exe >nul 2>&1
echo ✓ Service test completed

REM Step 8: Installation Summary
echo.
echo 🎉 Deployment Complete!
echo ======================

echo ✓ TRC20 Automation Service is ready to run
echo.
echo 📋 Next Steps:
echo 1. Start the service:
echo    start.bat
echo.
echo 2. Stop the service:
echo    stop.bat
echo.
echo 3. Install as Windows Service (optional):
echo    Use NSSM (Non-Sucking Service Manager) or similar tool
echo.
echo 4. View logs:
echo    Check trc20_automation.log file
echo.
echo 📊 Configuration Summary:
echo - Check your .env file for configuration details
echo - Make sure all required variables are set
echo - Keep your .env file secure!
echo.
echo ⚠️  Make sure to keep your .env file secure and never commit it to version control!
echo.
echo For support, check TRC20_AUTOMATION_IMPLEMENTATION.md
echo.
pause
