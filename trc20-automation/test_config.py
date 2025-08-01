#!/usr/bin/env python3
"""
Configuration Test Script for TRC20 Automation Service
Tests database connection, TRON network connectivity, and configuration
"""

import os
import sys
from dotenv import load_dotenv

def test_imports():
    """Test if all required packages are installed"""
    print("🔍 Testing package imports...")
    try:
        import psycopg2
        print("✓ psycopg2 imported successfully")
        
        import tronpy
        print("✓ tronpy imported successfully")
        
        import requests
        print("✓ requests imported successfully")
        
        from decimal import Decimal
        print("✓ decimal imported successfully")
        
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_environment():
    """Test environment configuration"""
    print("\n🔍 Testing environment configuration...")
    
    # Load environment variables
    load_dotenv()
    
    required_vars = [
        'TRON_MAIN_WALLET_ADDRESS',
        'DB_HOST',
        'DB_NAME', 
        'DB_USER',
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if not value or value.startswith('your_') or value.startswith('https://your-'):
            missing_vars.append(var)
        else:
            print(f"✓ {var}: {value[:20]}..." if len(value) > 20 else f"✓ {var}: {value}")
    
    if missing_vars:
        print(f"❌ Missing or placeholder values for: {', '.join(missing_vars)}")
        return False
    
    return True

def test_database_connection():
    """Test database connectivity"""
    print("\n🔍 Testing database connection...")
    
    try:
        import psycopg2
        
        # Try to connect using service role key as password (Supabase pattern)
        service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        # Supabase connection parameters
        conn_params = {
            'host': os.getenv('DB_HOST'),
            'database': os.getenv('DB_NAME'),
            'user': 'postgres',
            'password': service_key,  # Try using service key as password
            'port': int(os.getenv('DB_PORT', 5432))
        }
        
        print(f"Attempting connection to: {conn_params['host']}:{conn_params['port']}/{conn_params['database']}")
        
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✓ Database connection successful!")
        print(f"  PostgreSQL version: {version}")
        
        # Test if deposits table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'deposits'
            );
        """)
        
        table_exists = cursor.fetchone()[0]
        if table_exists:
            print("✓ 'deposits' table found")
        else:
            print("⚠️  'deposits' table not found - may need to be created")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("💡 Note: You may need to configure the database password manually")
        return False

def test_tron_connection():
    """Test TRON network connectivity"""
    print("\n🔍 Testing TRON network connection...")
    
    try:
        from tronpy import Tron
        
        # Initialize TRON client
        tron = Tron()
        
        # Test basic connectivity
        latest_block = tron.get_latest_block_number()
        print(f"✓ TRON network connection successful!")
        print(f"  Latest block: {latest_block}")
        
        # Test wallet address
        wallet_address = os.getenv('TRON_MAIN_WALLET_ADDRESS')
        if wallet_address:
            try:
                balance = tron.get_account_balance(wallet_address)
                print(f"✓ Main wallet balance: {balance} TRX")
            except Exception as e:
                print(f"⚠️  Could not get wallet balance: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ TRON connection failed: {e}")
        return False

def test_usdt_contract():
    """Test USDT TRC20 contract connectivity"""
    print("\n🔍 Testing USDT TRC20 contract...")
    
    try:
        from tronpy import Tron
        
        tron = Tron()
        usdt_contract_address = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
        
        # Get contract
        contract = tron.get_contract(usdt_contract_address)
        print(f"✓ USDT contract loaded successfully")
        print(f"  Contract address: {usdt_contract_address}")
        
        # Test contract functions
        try:
            name = contract.functions.name()
            symbol = contract.functions.symbol()
            decimals = contract.functions.decimals()
            
            print(f"  Token name: {name}")
            print(f"  Token symbol: {symbol}")
            print(f"  Token decimals: {decimals}")
        except Exception as e:
            print(f"⚠️  Could not read contract details: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ USDT contract test failed: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 TRC20 Automation Service - Configuration Test")
    print("=" * 50)
    
    tests = [
        ("Package Imports", test_imports),
        ("Environment Configuration", test_environment),
        ("Database Connection", test_database_connection),
        ("TRON Network Connection", test_tron_connection),
        ("USDT Contract", test_usdt_contract)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("-" * 25)
    
    passed = 0
    for test_name, result in results:
        status = "✓ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\nTests passed: {passed}/{len(results)}")
    
    if passed == len(results):
        print("\n🎉 All tests passed! TRC20 automation service is ready to run.")
        return 0
    else:
        print(f"\n⚠️  {len(results) - passed} test(s) failed. Please check configuration.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
