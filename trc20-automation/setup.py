#!/usr/bin/env python3
"""
Setup script for TRC20 Automation Service
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def install_dependencies():
    """Install required Python packages"""
    print("Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        sys.exit(1)

def setup_environment():
    """Setup environment configuration"""
    env_example = Path(".env.example")
    env_file = Path(".env")
    
    if not env_file.exists():
        if env_example.exists():
            shutil.copy(env_example, env_file)
            print("✓ Created .env file from .env.example")
            print("⚠️  Please edit .env file with your actual configuration values")
        else:
            print("Error: .env.example file not found")
            sys.exit(1)
    else:
        print("✓ .env file already exists")

def create_systemd_service():
    """Create systemd service file for Linux systems"""
    if os.name != 'posix':
        print("⚠️  Systemd service creation skipped (not on Linux)")
        return
    
    service_content = f"""[Unit]
Description=TRC20 USDT Automation Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory={os.getcwd()}
Environment=PATH={os.getcwd()}/venv/bin
ExecStart={sys.executable} main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"""
    
    service_file = Path("/etc/systemd/system/trc20-automation.service")
    try:
        with open(service_file, 'w') as f:
            f.write(service_content)
        print("✓ Systemd service file created")
        print("  To enable: sudo systemctl enable trc20-automation")
        print("  To start: sudo systemctl start trc20-automation")
    except PermissionError:
        print("⚠️  Could not create systemd service (run with sudo)")
        print("  Service file content saved to trc20-automation.service")
        with open("trc20-automation.service", 'w') as f:
            f.write(service_content)

def validate_configuration():
    """Validate configuration file"""
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        required_vars = [
            'TRON_MAIN_WALLET_ADDRESS',
            'DB_HOST',
            'DB_NAME',
            'DB_USER',
            'DB_PASSWORD'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            print("⚠️  Missing required environment variables:")
            for var in missing_vars:
                print(f"    - {var}")
            print("  Please update your .env file")
        else:
            print("✓ Configuration validation passed")
            
    except ImportError:
        print("⚠️  Could not validate configuration (python-dotenv not installed)")

def main():
    """Main setup function"""
    print("TRC20 Automation Service Setup")
    print("=" * 40)
    
    check_python_version()
    install_dependencies()
    setup_environment()
    validate_configuration()
    create_systemd_service()
    
    print("\n" + "=" * 40)
    print("Setup completed!")
    print("\nNext steps:")
    print("1. Edit .env file with your configuration")
    print("2. Test the service: python main.py")
    print("3. For production: use systemd service or process manager")
    print("\nFor help, see README.md")

if __name__ == "__main__":
    main()
