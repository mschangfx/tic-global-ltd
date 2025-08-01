# 🚀 TRC20 Automation Service - Complete Deployment Guide

## 📋 Prerequisites

Before starting the deployment, ensure you have:

- **Python 3.8+** installed
- **pip** package manager
- **Database access** (Supabase PostgreSQL)
- **TRON wallet** with private key
- **TronGrid API key** (optional but recommended)

## 🔧 **Step-by-Step Deployment**

### **Option 1: Automated Deployment (Recommended)**

#### **For Linux/macOS:**
```bash
cd trc20-automation
chmod +x deploy.sh
./deploy.sh
```

#### **For Windows:**
```cmd
cd trc20-automation
deploy.bat
```

### **Option 2: Manual Deployment**

#### **Step 1: Install Dependencies**

1. **Navigate to the automation directory:**
   ```bash
   cd trc20-automation
   ```

2. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   ```

3. **Activate virtual environment:**
   
   **Linux/macOS:**
   ```bash
   source venv/bin/activate
   ```
   
   **Windows:**
   ```cmd
   venv\Scripts\activate
   ```

4. **Upgrade pip:**
   ```bash
   pip install --upgrade pip
   ```

5. **Install required packages:**
   ```bash
   pip install -r requirements.txt
   ```

#### **Step 2: Configure Environment**

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file with your actual values:**
   ```bash
   nano .env  # or use your preferred editor
   ```

3. **Required configuration values:**
   ```env
   # TRON Configuration
   TRON_NETWORK=mainnet
   TRONGRID_API_KEY=your_trongrid_api_key_here
   TRON_MAIN_WALLET_ADDRESS=TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ
   TRON_MAIN_WALLET_PRIVATE_KEY=your_private_key_here

   # Database Configuration
   DB_HOST=db.your-project.supabase.co
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your_database_password
   DB_PORT=5432

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Deposit Configuration
   MIN_CONFIRMATIONS=1
   MIN_DEPOSIT_AMOUNT=10.0
   MAX_DEPOSIT_AMOUNT=200000.0
   ```

#### **Step 3: Test Configuration**

1. **Test database connection:**
   ```bash
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
   "
   ```

2. **Test TRON connection:**
   ```bash
   python3 -c "
   from tronpy import Tron
   from dotenv import load_dotenv
   import os
   
   load_dotenv()
   
   try:
       tron = Tron()
       balance = tron.get_account_balance(os.getenv('TRON_MAIN_WALLET_ADDRESS'))
       print(f'✓ TRON connection successful. Wallet balance: {balance} TRX')
   except Exception as e:
       print(f'❌ TRON connection failed: {e}')
   "
   ```

#### **Step 4: Run the Service**

1. **Start the service:**
   ```bash
   python main.py
   ```

2. **You should see output like:**
   ```
   2024-01-15 10:30:00,123 - __main__ - INFO - TRC20 Service initialized for mainnet
   2024-01-15 10:30:00,124 - __main__ - INFO - Main wallet address: TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ
   2024-01-15 10:30:00,125 - __main__ - INFO - Starting TRC20 monitoring service...
   2024-01-15 10:30:00,126 - __main__ - INFO - Starting deposit monitoring...
   ```

## 🔄 **Production Deployment Options**

### **Option 1: Systemd Service (Linux)**

1. **Create service file:**
   ```bash
   sudo nano /etc/systemd/system/trc20-automation.service
   ```

2. **Add service configuration:**
   ```ini
   [Unit]
   Description=TRC20 USDT Automation Service
   After=network.target

   [Service]
   Type=simple
   User=your-username
   WorkingDirectory=/path/to/trc20-automation
   Environment=PATH=/path/to/trc20-automation/venv/bin
   ExecStart=/path/to/trc20-automation/venv/bin/python main.py
   Restart=always
   RestartSec=10
   StandardOutput=journal
   StandardError=journal

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable trc20-automation
   sudo systemctl start trc20-automation
   ```

4. **Check service status:**
   ```bash
   sudo systemctl status trc20-automation
   ```

### **Option 2: PM2 Process Manager**

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Start with PM2:**
   ```bash
   pm2 start main.py --name trc20-automation --interpreter python3
   ```

3. **Save PM2 configuration:**
   ```bash
   pm2 save
   pm2 startup
   ```

### **Option 3: Docker Deployment**

1. **Create Dockerfile:**
   ```dockerfile
   FROM python:3.9-slim

   WORKDIR /app

   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   COPY . .

   CMD ["python", "main.py"]
   ```

2. **Build and run:**
   ```bash
   docker build -t trc20-automation .
   docker run -d --name trc20-service --env-file .env trc20-automation
   ```

## 📊 **Monitoring & Maintenance**

### **Check Service Status**

1. **View logs:**
   ```bash
   tail -f trc20_automation.log
   ```

2. **Check systemd logs:**
   ```bash
   sudo journalctl -u trc20-automation -f
   ```

3. **Monitor process:**
   ```bash
   ps aux | grep python
   ```

### **Health Checks**

1. **API health check:**
   ```bash
   curl http://localhost:3000/api/trc20/monitor
   ```

2. **Database connectivity:**
   ```bash
   python3 -c "from main import TRC20AutomationService; service = TRC20AutomationService(); print('✓ Service initialized successfully')"
   ```

## 🔒 **Security Considerations**

### **Environment Security**
- Never commit `.env` file to version control
- Use strong database passwords
- Restrict database access to specific IPs
- Keep private keys secure and encrypted

### **Server Security**
- Use firewall to restrict access
- Keep system updated
- Monitor logs for suspicious activity
- Use SSL/TLS for all connections

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Database Connection Failed**
   - Check database credentials in `.env`
   - Verify database server is accessible
   - Check firewall settings

2. **TRON Connection Failed**
   - Verify internet connectivity
   - Check TronGrid API key
   - Try different TRON node

3. **Service Won't Start**
   - Check Python version (3.8+ required)
   - Verify all dependencies installed
   - Check log files for errors

4. **Transactions Not Detected**
   - Verify wallet address is correct
   - Check TronGrid API limits
   - Monitor network connectivity

### **Log Locations**
- Service logs: `trc20_automation.log`
- System logs: `/var/log/syslog` (Linux)
- Systemd logs: `journalctl -u trc20-automation`

## 📞 **Support**

If you encounter issues:

1. Check the logs first
2. Verify configuration in `.env`
3. Test database and TRON connectivity
4. Review the troubleshooting section
5. Check the main documentation: `TRC20_AUTOMATION_IMPLEMENTATION.md`

## ✅ **Deployment Checklist**

- [ ] Python 3.8+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] Environment configured (`.env`)
- [ ] Database connection tested
- [ ] TRON connection tested
- [ ] Service starts successfully
- [ ] Logs are being generated
- [ ] Production deployment method chosen
- [ ] Monitoring set up
- [ ] Security measures implemented

🎉 **Your TRC20 automation service is now ready for production!**
