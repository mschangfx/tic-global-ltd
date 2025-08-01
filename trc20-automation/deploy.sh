#!/bin/bash

# TRC20 Automation Service Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

echo "🚀 TRC20 Automation Service Deployment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Step 1: Check Prerequisites
echo -e "\n${BLUE}Step 1: Checking Prerequisites${NC}"
echo "--------------------------------"

# Check Python version
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_status "Python 3 found: $PYTHON_VERSION"
    
    # Check if version is 3.8+
    if python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
        print_status "Python version is compatible (3.8+)"
    else
        print_error "Python 3.8+ is required. Current version: $PYTHON_VERSION"
        exit 1
    fi
else
    print_error "Python 3 is not installed"
    echo "Please install Python 3.8+ and try again"
    exit 1
fi

# Check pip
if command -v pip3 &> /dev/null; then
    print_status "pip3 found"
else
    print_error "pip3 is not installed"
    exit 1
fi

# Step 2: Create Virtual Environment
echo -e "\n${BLUE}Step 2: Setting up Virtual Environment${NC}"
echo "----------------------------------------"

if [ ! -d "venv" ]; then
    print_info "Creating virtual environment..."
    python3 -m venv venv
    print_status "Virtual environment created"
else
    print_status "Virtual environment already exists"
fi

# Activate virtual environment
print_info "Activating virtual environment..."
source venv/bin/activate
print_status "Virtual environment activated"

# Step 3: Install Dependencies
echo -e "\n${BLUE}Step 3: Installing Dependencies${NC}"
echo "--------------------------------"

print_info "Upgrading pip..."
pip install --upgrade pip

print_info "Installing required packages..."
pip install -r requirements.txt
print_status "All dependencies installed successfully"

# Step 4: Environment Configuration
echo -e "\n${BLUE}Step 4: Environment Configuration${NC}"
echo "----------------------------------"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created .env file from template"
        print_warning "Please edit .env file with your actual configuration values"
        print_info "Required variables to configure:"
        echo "  - TRONGRID_API_KEY"
        echo "  - TRON_MAIN_WALLET_PRIVATE_KEY"
        echo "  - DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
        echo "  - SUPABASE_SERVICE_ROLE_KEY"
        echo ""
        read -p "Press Enter after you've configured the .env file..."
    else
        print_error ".env.example file not found"
        exit 1
    fi
else
    print_status ".env file already exists"
fi

# Step 5: Validate Configuration
echo -e "\n${BLUE}Step 5: Validating Configuration${NC}"
echo "----------------------------------"

print_info "Checking required environment variables..."

# Source the .env file
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
REQUIRED_VARS=("TRON_MAIN_WALLET_ADDRESS" "DB_HOST" "DB_NAME" "DB_USER" "DB_PASSWORD")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    print_status "All required environment variables are set"
else
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    print_warning "Please update your .env file and run this script again"
    exit 1
fi

# Step 6: Test Database Connection
echo -e "\n${BLUE}Step 6: Testing Database Connection${NC}"
echo "------------------------------------"

print_info "Testing database connectivity..."
python3 -c "
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

if [ $? -eq 0 ]; then
    print_status "Database connection test passed"
else
    print_error "Database connection test failed"
    exit 1
fi

# Step 7: Create Service Files
echo -e "\n${BLUE}Step 7: Creating Service Files${NC}"
echo "-------------------------------"

# Create systemd service file
SERVICE_FILE="trc20-automation.service"
cat > $SERVICE_FILE << EOF
[Unit]
Description=TRC20 USDT Automation Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(pwd)/venv/bin/python main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

print_status "Systemd service file created: $SERVICE_FILE"

# Create startup script
cat > start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
python main.py
EOF

chmod +x start.sh
print_status "Startup script created: start.sh"

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash
pkill -f "python main.py"
echo "TRC20 automation service stopped"
EOF

chmod +x stop.sh
print_status "Stop script created: stop.sh"

# Step 8: Test Run
echo -e "\n${BLUE}Step 8: Testing Service${NC}"
echo "------------------------"

print_info "Running a quick test of the service..."
timeout 10s python3 main.py &
TEST_PID=$!

sleep 5

if kill -0 $TEST_PID 2>/dev/null; then
    print_status "Service test successful - process is running"
    kill $TEST_PID 2>/dev/null
else
    print_error "Service test failed - check logs for errors"
fi

# Step 9: Installation Summary
echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo "========================"

print_status "TRC20 Automation Service is ready to run"
echo ""
echo "📋 Next Steps:"
echo "1. Start the service:"
echo "   ./start.sh"
echo ""
echo "2. Stop the service:"
echo "   ./stop.sh"
echo ""
echo "3. Install as system service (optional):"
echo "   sudo cp trc20-automation.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable trc20-automation"
echo "   sudo systemctl start trc20-automation"
echo ""
echo "4. Check service status:"
echo "   sudo systemctl status trc20-automation"
echo ""
echo "5. View logs:"
echo "   tail -f trc20_automation.log"
echo "   sudo journalctl -u trc20-automation -f"
echo ""
echo "📊 Configuration Summary:"
echo "- Main Wallet: $TRON_MAIN_WALLET_ADDRESS"
echo "- Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo "- Network: ${TRON_NETWORK:-mainnet}"
echo "- Min Confirmations: ${MIN_CONFIRMATIONS:-1}"
echo ""
print_warning "Make sure to keep your .env file secure and never commit it to version control!"

echo -e "\n${BLUE}For support, check TRC20_AUTOMATION_IMPLEMENTATION.md${NC}"
