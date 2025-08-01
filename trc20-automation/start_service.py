#!/usr/bin/env python3
"""
TRC20 Automation Service Startup Script
Provides easy startup with configuration validation
"""

import os
import sys
import time
import subprocess
from dotenv import load_dotenv

def print_banner():
    """Print startup banner"""
    print("=" * 60)
    print("🚀 TRC20 USDT Automation Service")
    print("   Automated Deposit & Withdrawal Processing")
    print("=" * 60)

def validate_configuration():
    """Validate configuration before starting"""
    load_dotenv()
    
    print("🔍 Validating configuration...")
    
    required_vars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'TRON_MAIN_WALLET_ADDRESS'
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            # Show partial value for security
            display_value = value[:20] + "..." if len(value) > 20 else value
            print(f"  ✓ {var}: {display_value}")
    
    if missing_vars:
        print(f"❌ Missing required variables: {', '.join(missing_vars)}")
        return False
    
    print("✅ Configuration validation passed")
    return True

def test_database_connection():
    """Test database connection"""
    print("🔍 Testing database connection...")
    
    try:
        import requests
        load_dotenv()
        
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        headers = {
            'apikey': service_key,
            'Authorization': f'Bearer {service_key}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(f"{supabase_url}/rest/v1/deposits?limit=1", headers=headers)
        
        if response.status_code == 200:
            print("✅ Database connection successful")
            return True
        else:
            print(f"❌ Database connection failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

def show_service_info():
    """Show service information"""
    load_dotenv()
    
    print("\n📊 Service Configuration:")
    print("-" * 30)
    print(f"Main Wallet: {os.getenv('TRON_MAIN_WALLET_ADDRESS')}")
    print(f"Network: {os.getenv('TRON_NETWORK', 'mainnet')}")
    print(f"Min Confirmations: {os.getenv('MIN_CONFIRMATIONS', '1')}")
    print(f"Monitoring Interval: {os.getenv('MONITORING_INTERVAL', '30')} seconds")
    print(f"Min Deposit: ${os.getenv('MIN_DEPOSIT_AMOUNT', '10')} USDT")
    print(f"Max Deposit: ${os.getenv('MAX_DEPOSIT_AMOUNT', '200000')} USDT")

def show_usage_instructions():
    """Show usage instructions"""
    print("\n📋 How to Use:")
    print("-" * 15)
    print("1. 🔄 Service will monitor for deposits automatically")
    print("2. 💰 Deposits to TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ will be detected")
    print("3. ✅ Confirmed deposits will be credited to user wallets")
    print("4. 💸 Withdrawal requests will be processed automatically")
    print("5. 📝 All activities are logged to trc20_automation.log")
    
    print("\n🧪 Testing:")
    print("-" * 10)
    print("• Create test deposit: POST /api/trc20/create-deposit")
    print("• Check deposits: GET /api/trc20/create-deposit")
    print("• Monitor service: GET /api/trc20/monitor")
    print("• Process withdrawal: POST /api/trc20/withdraw")

def start_service():
    """Start the TRC20 automation service"""
    print("\n🚀 Starting TRC20 Automation Service...")
    print("Press Ctrl+C to stop the service")
    print("-" * 40)
    
    try:
        # Import and run the service
        from trc20_service import TRC20AutomationService
        
        service = TRC20AutomationService()
        service.start_monitoring()
        
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
        return 0
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed: pip install -r requirements.txt")
        return 1
    except Exception as e:
        print(f"❌ Service error: {e}")
        return 1

def main():
    """Main function"""
    print_banner()
    
    # Validate configuration
    if not validate_configuration():
        print("\n❌ Configuration validation failed")
        print("Please check your .env file and try again")
        return 1
    
    # Test database connection
    if not test_database_connection():
        print("\n❌ Database connection failed")
        print("Please check your Supabase configuration")
        return 1
    
    # Show service info
    show_service_info()
    show_usage_instructions()
    
    # Ask user to confirm startup
    print("\n" + "=" * 60)
    try:
        input("Press Enter to start the service (or Ctrl+C to cancel)...")
    except KeyboardInterrupt:
        print("\n🛑 Startup cancelled by user")
        return 0
    
    # Start the service
    return start_service()

if __name__ == "__main__":
    sys.exit(main())
