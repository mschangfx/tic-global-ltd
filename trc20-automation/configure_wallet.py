#!/usr/bin/env python3
"""
Secure Wallet Configuration Script for TRC20 Automation Service
Helps you safely configure your wallet address and private key
"""

import os
import re
import getpass
from dotenv import load_dotenv, set_key

def print_banner():
    """Print configuration banner"""
    print("=" * 60)
    print("🔐 TRC20 Wallet Configuration")
    print("   Secure Setup for Your TRON Wallet")
    print("=" * 60)

def validate_tron_address(address):
    """Validate TRON address format"""
    if not address:
        return False
    
    # TRON address should start with T and be 34 characters long
    if not re.match(r'^T[A-Za-z1-9]{33}$', address):
        return False
    
    return True

def validate_private_key(private_key):
    """Validate private key format"""
    if not private_key:
        return False
    
    # Remove 0x prefix if present
    if private_key.startswith('0x'):
        private_key = private_key[2:]
    
    # Should be 64 hex characters
    if not re.match(r'^[a-fA-F0-9]{64}$', private_key):
        return False
    
    return True

def get_current_config():
    """Get current configuration"""
    load_dotenv()
    
    current_address = os.getenv('TRON_MAIN_WALLET_ADDRESS', '')
    current_key = os.getenv('TRON_MAIN_WALLET_PRIVATE_KEY', '')
    current_api_key = os.getenv('TRONGRID_API_KEY', 'demo')
    
    return current_address, current_key, current_api_key

def configure_wallet_address():
    """Configure wallet address"""
    current_address, _, _ = get_current_config()
    
    print("\n🏦 Wallet Address Configuration")
    print("-" * 35)
    print(f"Current address: {current_address}")
    print("\nThis is the TRON address where users will send USDT deposits.")
    print("Make sure you control this wallet and have access to it.")
    
    while True:
        new_address = input("\nEnter your TRON wallet address (or press Enter to keep current): ").strip()
        
        if not new_address:
            print(f"✓ Keeping current address: {current_address}")
            return current_address
        
        if validate_tron_address(new_address):
            print(f"✓ Valid TRON address: {new_address}")
            return new_address
        else:
            print("❌ Invalid TRON address format. Please enter a valid address starting with 'T'")

def configure_private_key():
    """Configure private key securely"""
    _, current_key, _ = get_current_config()
    
    print("\n🔑 Private Key Configuration")
    print("-" * 30)
    print("This private key will be used to process withdrawals.")
    print("⚠️  SECURITY WARNING: Keep this private key secure!")
    print("⚠️  Never share it or commit it to version control!")
    
    # Check if current key is placeholder
    is_placeholder = current_key in ['0000000000000000000000000000000000000000000000000000000000000001', 'your_private_key_here', '']
    
    if is_placeholder:
        print("❌ Current private key is a placeholder - you MUST update it")
    else:
        print("✓ Private key is configured (not showing for security)")
    
    while True:
        update_key = input("\nDo you want to update the private key? (y/n): ").lower().strip()
        
        if update_key == 'n' and not is_placeholder:
            print("✓ Keeping current private key")
            return current_key
        elif update_key == 'n' and is_placeholder:
            print("❌ You must configure a real private key for withdrawals to work")
            continue
        elif update_key == 'y':
            break
        else:
            print("Please enter 'y' or 'n'")
    
    while True:
        print("\nEnter your TRON wallet private key:")
        print("(Input will be hidden for security)")
        new_key = getpass.getpass("Private key: ").strip()
        
        if validate_private_key(new_key):
            # Remove 0x prefix if present
            if new_key.startswith('0x'):
                new_key = new_key[2:]
            
            print("✓ Valid private key format")
            
            # Confirm the key
            confirm = input("Confirm this is correct? (y/n): ").lower().strip()
            if confirm == 'y':
                return new_key
            else:
                print("Let's try again...")
        else:
            print("❌ Invalid private key format. Should be 64 hex characters (with or without 0x prefix)")

def configure_api_key():
    """Configure TronGrid API key"""
    _, _, current_api_key = get_current_config()
    
    print("\n🌐 TronGrid API Key Configuration (Optional)")
    print("-" * 45)
    print(f"Current API key: {current_api_key}")
    print("\nA TronGrid API key provides:")
    print("• Higher rate limits for API calls")
    print("• Better reliability for transaction monitoring")
    print("• Free tier available at: https://www.trongrid.io/")
    
    new_api_key = input("\nEnter TronGrid API key (or press Enter to keep current): ").strip()
    
    if not new_api_key:
        print(f"✓ Keeping current API key: {current_api_key}")
        return current_api_key
    else:
        print(f"✓ Updated API key: {new_api_key}")
        return new_api_key

def update_env_file(address, private_key, api_key):
    """Update .env file with new configuration"""
    env_file = '.env'
    
    print("\n💾 Updating configuration file...")
    
    try:
        # Update each value
        set_key(env_file, 'TRON_MAIN_WALLET_ADDRESS', address)
        set_key(env_file, 'TRON_MAIN_WALLET_PRIVATE_KEY', private_key)
        set_key(env_file, 'TRONGRID_API_KEY', api_key)
        
        print("✅ Configuration file updated successfully!")
        
    except Exception as e:
        print(f"❌ Error updating configuration file: {e}")
        return False
    
    return True

def test_configuration():
    """Test the new configuration"""
    print("\n🧪 Testing Configuration...")
    print("-" * 25)
    
    try:
        from tronpy import Tron
        load_dotenv()  # Reload environment
        
        address = os.getenv('TRON_MAIN_WALLET_ADDRESS')
        api_key = os.getenv('TRONGRID_API_KEY')
        
        # Test TRON connection
        if api_key and api_key != 'demo':
            tron = Tron(network='mainnet', api_key=api_key)
        else:
            tron = Tron(network='mainnet')
        
        # Test wallet address
        try:
            balance = tron.get_account_balance(address)
            print(f"✅ Wallet connection successful!")
            print(f"   Address: {address}")
            print(f"   Balance: {balance} TRX")
        except Exception as e:
            print(f"⚠️  Wallet test warning: {e}")
            print("   This might be due to rate limiting or network issues")
        
        print("✅ Configuration test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def show_security_reminders():
    """Show important security reminders"""
    print("\n🔒 SECURITY REMINDERS:")
    print("-" * 20)
    print("1. ✅ Never share your private key with anyone")
    print("2. ✅ Never commit .env file to version control")
    print("3. ✅ Keep backups of your wallet in a secure location")
    print("4. ✅ Use hardware wallets for large amounts")
    print("5. ✅ Test with small amounts first")
    print("6. ✅ Monitor your wallet regularly")

def main():
    """Main configuration function"""
    print_banner()
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("❌ .env file not found!")
        print("Please run the deployment script first to create the .env file")
        return 1
    
    print("This script will help you securely configure your TRON wallet for the automation service.")
    print("\n⚠️  IMPORTANT: Make sure you have:")
    print("   • Your TRON wallet address")
    print("   • Your TRON wallet private key")
    print("   • (Optional) TronGrid API key")
    
    try:
        input("\nPress Enter to continue (or Ctrl+C to cancel)...")
    except KeyboardInterrupt:
        print("\n🛑 Configuration cancelled")
        return 0
    
    # Configure each component
    address = configure_wallet_address()
    private_key = configure_private_key()
    api_key = configure_api_key()
    
    # Update configuration file
    if update_env_file(address, private_key, api_key):
        # Test configuration
        test_configuration()
        
        # Show security reminders
        show_security_reminders()
        
        print("\n🎉 Wallet configuration completed successfully!")
        print("\nYour TRC20 automation service is now configured with:")
        print(f"   • Wallet Address: {address}")
        print(f"   • Private Key: {'*' * 60} (hidden)")
        print(f"   • API Key: {api_key}")
        
        print("\n🚀 Next steps:")
        print("   1. Start the service: python start_service.py")
        print("   2. Test with small deposits first")
        print("   3. Monitor the logs for any issues")
        
        return 0
    else:
        print("❌ Configuration failed")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
