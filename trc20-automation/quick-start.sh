#!/bin/bash

# Quick Start Script for TRC20 Automation Service
# This script provides a fast way to get the service running

set -e

echo "⚡ TRC20 Automation Service - Quick Start"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ Error: main.py not found. Please run this script from the trc20-automation directory."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies if requirements.txt is newer than the last install
if [ ! -f "venv/.installed" ] || [ "requirements.txt" -nt "venv/.installed" ]; then
    echo "📦 Installing/updating dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    touch venv/.installed
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already up to date"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "⚙️  Creating .env file from template..."
        cp .env.example .env
        echo "✓ .env file created"
        echo ""
        echo "🚨 IMPORTANT: Please edit the .env file with your actual configuration:"
        echo "   - TRONGRID_API_KEY"
        echo "   - TRON_MAIN_WALLET_PRIVATE_KEY"
        echo "   - Database credentials (DB_HOST, DB_USER, DB_PASSWORD, etc.)"
        echo "   - SUPABASE_SERVICE_ROLE_KEY"
        echo ""
        echo "Opening .env file for editing..."
        
        # Try to open with different editors
        if command -v code &> /dev/null; then
            code .env
        elif command -v nano &> /dev/null; then
            nano .env
        elif command -v vim &> /dev/null; then
            vim .env
        else
            echo "Please edit .env file manually with your preferred editor"
        fi
        
        echo ""
        read -p "Press Enter after you've configured the .env file..."
    else
        echo "❌ Error: .env.example file not found"
        exit 1
    fi
fi

# Quick configuration check
echo "🔍 Checking configuration..."
source .env

MISSING_VARS=()
if [ -z "$TRON_MAIN_WALLET_ADDRESS" ]; then MISSING_VARS+=("TRON_MAIN_WALLET_ADDRESS"); fi
if [ -z "$DB_HOST" ]; then MISSING_VARS+=("DB_HOST"); fi
if [ -z "$DB_NAME" ]; then MISSING_VARS+=("DB_NAME"); fi
if [ -z "$DB_USER" ]; then MISSING_VARS+=("DB_USER"); fi
if [ -z "$DB_PASSWORD" ]; then MISSING_VARS+=("DB_PASSWORD"); fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo "Please update your .env file and run this script again."
    exit 1
fi

echo "✓ Basic configuration check passed"

# Test database connection
echo "🔍 Testing database connection..."
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
" || {
    echo "❌ Database connection failed. Please check your database configuration in .env"
    exit 1
}

# Create start/stop scripts if they don't exist
if [ ! -f "start.sh" ]; then
    cat > start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
echo "🚀 Starting TRC20 Automation Service..."
echo "Press Ctrl+C to stop"
python main.py
EOF
    chmod +x start.sh
    echo "✓ Created start.sh script"
fi

if [ ! -f "stop.sh" ]; then
    cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping TRC20 Automation Service..."
pkill -f "python main.py"
echo "✓ Service stopped"
EOF
    chmod +x stop.sh
    echo "✓ Created stop.sh script"
fi

echo ""
echo "🎉 Quick Start Complete!"
echo "======================="
echo ""
echo "Your TRC20 Automation Service is ready to run!"
echo ""
echo "📋 Available Commands:"
echo "  ./start.sh    - Start the service"
echo "  ./stop.sh     - Stop the service"
echo "  python main.py - Run directly (current session)"
echo ""
echo "📊 Configuration Summary:"
echo "  Main Wallet: $TRON_MAIN_WALLET_ADDRESS"
echo "  Database: $DB_HOST:${DB_PORT:-5432}/$DB_NAME"
echo "  Network: ${TRON_NETWORK:-mainnet}"
echo ""
echo "🚀 To start the service now, run:"
echo "  ./start.sh"
echo ""
echo "📝 Logs will be saved to: trc20_automation.log"
echo ""
echo "For more deployment options, see DEPLOYMENT_GUIDE.md"
