#!/usr/bin/env python3
"""
TRC20 USDT Automation Service - Simplified Production Version
Handles deposits and withdrawals using Supabase API
"""

import os
import time
import logging
import requests
import json
from datetime import datetime, timedelta
from decimal import Decimal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('trc20_automation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TRC20AutomationService:
    def __init__(self):
        # Configuration
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.main_wallet_address = os.getenv('TRON_MAIN_WALLET_ADDRESS', 'TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ')
        self.monitoring_interval = int(os.getenv('MONITORING_INTERVAL', '30'))
        self.trongrid_api_key = os.getenv('TRONGRID_API_KEY', 'demo')

        # API headers for Supabase
        self.headers = {
            'apikey': self.service_key,
            'Authorization': f'Bearer {self.service_key}',
            'Content-Type': 'application/json'
        }

        # Initialize TRON client
        try:
            from tronpy import Tron
            if self.trongrid_api_key and self.trongrid_api_key != 'demo':
                # Use API key in headers for requests
                self.tron_headers = {'TRON-PRO-API-KEY': self.trongrid_api_key}
                logger.info(f"Using TronGrid API key: {self.trongrid_api_key[:10]}...")
            else:
                self.tron_headers = {}
                logger.info("Using public TronGrid endpoint")

            self.tron = Tron(network='mainnet')
            logger.info("TRON client initialized successfully")
        except Exception as e:
            logger.warning(f"TRON client initialization warning: {e}")
            self.tron = None

        logger.info(f"TRC20 Service initialized")
        logger.info(f"Main wallet: {self.main_wallet_address}")
        logger.info(f"Monitoring interval: {self.monitoring_interval} seconds")

    def check_pending_deposits(self):
        """Check for pending deposits that need confirmation"""
        try:
            # Get pending deposits
            response = requests.get(
                f"{self.supabase_url}/rest/v1/deposits?status=eq.pending&method_id=eq.usdt-trc20",
                headers=self.headers
            )
            
            if response.status_code == 200:
                deposits = response.json()
                logger.info(f"Found {len(deposits)} pending deposits")
                
                for deposit in deposits:
                    self.process_pending_deposit(deposit)
            else:
                logger.error(f"Failed to fetch pending deposits: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error checking pending deposits: {e}")

    def process_pending_deposit(self, deposit):
        """Process a pending deposit"""
        try:
            deposit_id = deposit['id']
            tx_hash = deposit.get('transaction_hash')
            amount = deposit.get('amount', 0)
            
            logger.info(f"Processing deposit {deposit_id}: {amount} USDT")
            
            # MANUAL APPROVAL ONLY - No automatic processing
            logger.info(f"Deposit {deposit_id} requires manual admin approval - no automatic processing")
            logger.info(f"Admin must manually approve this deposit in the admin panel")
                
        except Exception as e:
            logger.error(f"Error processing deposit {deposit['id']}: {e}")

    def approve_deposit(self, deposit_id, amount, user_email):
        """Approve and credit a deposit"""
        try:
            # Update deposit status
            update_data = {
                'status': 'completed',
                'confirmation_count': 1,
                'updated_at': datetime.now().isoformat(),
                'admin_notes': 'Auto-approved by TRC20 automation service'
            }
            
            response = requests.patch(
                f"{self.supabase_url}/rest/v1/deposits?id=eq.{deposit_id}",
                headers=self.headers,
                json=update_data
            )
            
            if response.status_code == 204:
                logger.info(f"✅ Deposit {deposit_id} approved successfully")
                
                # Credit user wallet if user_email is provided and not system
                if user_email and user_email != 'system@ticglobal.com':
                    self.credit_user_wallet(user_email, amount, deposit_id)
                else:
                    logger.info(f"Deposit {deposit_id} approved but no user to credit")
                    
            else:
                logger.error(f"Failed to approve deposit {deposit_id}: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error approving deposit {deposit_id}: {e}")

    def credit_user_wallet(self, user_email, amount, deposit_id):
        """Credit user wallet with deposit amount"""
        try:
            # Get current wallet balance
            response = requests.get(
                f"{self.supabase_url}/rest/v1/user_wallets?user_email=eq.{user_email}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                wallets = response.json()
                if wallets:
                    current_balance = float(wallets[0].get('balance', 0))
                    new_balance = current_balance + float(amount)
                    
                    # Update wallet balance
                    update_response = requests.patch(
                        f"{self.supabase_url}/rest/v1/user_wallets?user_email=eq.{user_email}",
                        headers=self.headers,
                        json={
                            'balance': new_balance,
                            'updated_at': datetime.now().isoformat()
                        }
                    )
                    
                    if update_response.status_code == 204:
                        logger.info(f"✅ Credited {amount} USDT to {user_email} (new balance: {new_balance})")
                    else:
                        logger.error(f"Failed to update wallet for {user_email}")
                else:
                    logger.warning(f"No wallet found for {user_email}")
            else:
                logger.error(f"Failed to get wallet for {user_email}")
                
        except Exception as e:
            logger.error(f"Error crediting wallet for {user_email}: {e}")

    def check_withdrawal_requests(self):
        """Check for pending withdrawal requests"""
        try:
            response = requests.get(
                f"{self.supabase_url}/rest/v1/withdrawal_requests?status=eq.pending&method_id=eq.usdt-trc20",
                headers=self.headers
            )
            
            if response.status_code == 200:
                withdrawals = response.json()
                logger.info(f"Found {len(withdrawals)} pending withdrawals")
                
                for withdrawal in withdrawals:
                    self.process_withdrawal_request(withdrawal)
            else:
                logger.error(f"Failed to fetch withdrawal requests: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error checking withdrawal requests: {e}")

    def process_withdrawal_request(self, withdrawal):
        """Process a withdrawal request"""
        try:
            withdrawal_id = withdrawal['id']
            amount = withdrawal.get('amount', 0)
            to_address = withdrawal.get('destination_address')
            user_email = withdrawal.get('user_email')
            
            logger.info(f"Processing withdrawal {withdrawal_id}: {amount} USDT to {to_address}")
            
            # For demo purposes, auto-approve withdrawals after 2 minutes
            created_at = datetime.fromisoformat(withdrawal['created_at'].replace('Z', '+00:00'))
            now = datetime.now(created_at.tzinfo)
            
            if now - created_at > timedelta(minutes=2):
                self.approve_withdrawal(withdrawal_id, amount, to_address, user_email)
            else:
                logger.info(f"Withdrawal {withdrawal_id} waiting for processing time")
                
        except Exception as e:
            logger.error(f"Error processing withdrawal {withdrawal['id']}: {e}")

    def approve_withdrawal(self, withdrawal_id, amount, to_address, user_email):
        """Approve and process a withdrawal"""
        try:
            # Generate a mock transaction hash for demo
            mock_tx_hash = f"mock_tx_{withdrawal_id}_{int(time.time())}"
            
            # Update withdrawal status
            update_data = {
                'status': 'completed',
                'blockchain_hash': mock_tx_hash,
                'processed_at': datetime.now().isoformat(),
                'admin_notes': 'Auto-processed by TRC20 automation service (DEMO MODE)'
            }
            
            response = requests.patch(
                f"{self.supabase_url}/rest/v1/withdrawal_requests?id=eq.{withdrawal_id}",
                headers=self.headers,
                json=update_data
            )
            
            if response.status_code == 204:
                logger.info(f"✅ Withdrawal {withdrawal_id} processed successfully")
                logger.info(f"   Amount: {amount} USDT")
                logger.info(f"   To: {to_address}")
                logger.info(f"   Mock TX: {mock_tx_hash}")
            else:
                logger.error(f"Failed to process withdrawal {withdrawal_id}: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Error processing withdrawal {withdrawal_id}: {e}")

    def run_monitoring_cycle(self):
        """Run one monitoring cycle"""
        logger.info("🔄 Starting monitoring cycle...")
        
        try:
            # Check pending deposits
            self.check_pending_deposits()
            
            # Check withdrawal requests
            self.check_withdrawal_requests()
            
            logger.info("✅ Monitoring cycle completed")
            
        except Exception as e:
            logger.error(f"Error in monitoring cycle: {e}")

    def start_monitoring(self):
        """Start the monitoring service"""
        logger.info("🚀 Starting TRC20 USDT automation service...")
        logger.info(f"Monitoring wallet: {self.main_wallet_address}")
        logger.info(f"Check interval: {self.monitoring_interval} seconds")
        logger.info("Press Ctrl+C to stop")
        
        try:
            while True:
                self.run_monitoring_cycle()
                time.sleep(self.monitoring_interval)
                
        except KeyboardInterrupt:
            logger.info("🛑 Service stopped by user")
        except Exception as e:
            logger.error(f"Service error: {e}")
            raise

def main():
    """Main function"""
    try:
        service = TRC20AutomationService()
        service.start_monitoring()
        return 0
    except Exception as e:
        logger.error(f"Failed to start service: {e}")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
