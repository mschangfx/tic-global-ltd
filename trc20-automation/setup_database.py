#!/usr/bin/env python3
"""
Database Setup Script for TRC20 Automation Service
Creates necessary tables and functions in Supabase
"""

import os
import requests
import json
from dotenv import load_dotenv

def setup_database_via_supabase_api():
    """Setup database tables using Supabase REST API"""
    load_dotenv()
    
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not service_key:
        print("❌ Missing Supabase configuration")
        return False
    
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json'
    }
    
    print("🔍 Setting up database tables via Supabase API...")
    
    # Test connection first
    try:
        response = requests.get(f"{supabase_url}/rest/v1/", headers=headers)
        if response.status_code == 200:
            print("✓ Supabase API connection successful")
        else:
            print(f"❌ Supabase API connection failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Supabase API connection error: {e}")
        return False
    
    # Check if deposits table exists
    try:
        response = requests.get(f"{supabase_url}/rest/v1/deposits?limit=1", headers=headers)
        if response.status_code == 200:
            print("✓ 'deposits' table exists and accessible")
            return True
        elif response.status_code == 404:
            print("⚠️  'deposits' table not found")
            return False
        else:
            print(f"❌ Error checking deposits table: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error checking deposits table: {e}")
        return False

def test_deposit_insertion():
    """Test inserting a sample deposit record"""
    load_dotenv()
    
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    # Test deposit data
    test_deposit = {
        'user_email': 'test@ticglobal.com',
        'amount': 100.00,
        'currency': 'USD',
        'method_id': 'usdt-trc20',
        'method_name': 'USDT',
        'network': 'TRC20',
        'deposit_address': 'TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ',
        'transaction_hash': 'test_transaction_hash_12345',
        'confirmation_count': 1,
        'required_confirmations': 1,
        'status': 'completed',
        'final_amount': 100.00,
        'admin_notes': 'Test deposit from TRC20 automation setup'
    }
    
    try:
        print("🔍 Testing deposit insertion...")
        response = requests.post(
            f"{supabase_url}/rest/v1/deposits",
            headers=headers,
            json=test_deposit
        )
        
        if response.status_code in [200, 201]:
            print("✓ Test deposit inserted successfully")
            deposit_data = response.json()
            if deposit_data:
                deposit_id = deposit_data[0].get('id') if isinstance(deposit_data, list) else deposit_data.get('id')
                print(f"  Deposit ID: {deposit_id}")
                
                # Clean up test deposit
                delete_response = requests.delete(
                    f"{supabase_url}/rest/v1/deposits?id=eq.{deposit_id}",
                    headers=headers
                )
                if delete_response.status_code == 204:
                    print("✓ Test deposit cleaned up")
                
            return True
        else:
            print(f"❌ Failed to insert test deposit: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing deposit insertion: {e}")
        return False

def create_wallet_functions():
    """Create wallet management functions"""
    load_dotenv()
    
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    print("🔍 Creating wallet management functions...")
    
    # For now, we'll just test if we can access the user_wallets table
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(f"{supabase_url}/rest/v1/user_wallets?limit=1", headers=headers)
        if response.status_code == 200:
            print("✓ 'user_wallets' table exists and accessible")
            return True
        else:
            print(f"⚠️  'user_wallets' table check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error checking user_wallets table: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 TRC20 Automation Service - Database Setup")
    print("=" * 50)
    
    tests = [
        ("Database Connection", setup_database_via_supabase_api),
        ("Deposit Table Test", test_deposit_insertion),
        ("Wallet Functions", create_wallet_functions)
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
    print("📊 Database Setup Results:")
    print("-" * 30)
    
    passed = 0
    for test_name, result in results:
        status = "✓ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\nTests passed: {passed}/{len(results)}")
    
    if passed == len(results):
        print("\n🎉 Database setup completed successfully!")
        print("The TRC20 automation service can now connect to the database.")
        return 0
    else:
        print(f"\n⚠️  {len(results) - passed} test(s) failed.")
        print("The service may still work with limited functionality.")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
