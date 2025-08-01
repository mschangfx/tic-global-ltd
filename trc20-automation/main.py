#!/usr/bin/env python3
"""
TRC20 USDT Automation Service
Handles deposits and withdrawals for TRON network
Enhanced version with full integration
"""

import os
import time
import logging
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from decimal import Decimal

from tronpy import Tron
from tronpy.keys import PrivateKey
from tronpy.providers import HTTPProvider
from tronpy.exceptions import TransactionError, ValidationError
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
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
        # TRON Configuration
        self.network = os.getenv('TRON_NETWORK', 'mainnet')
        self.api_key = os.getenv('TRONGRID_API_KEY')

        # Initialize TRON client
        if self.network == 'mainnet':
            provider_url = "https://api.trongrid.io"
        else:
            provider_url = "https://api.shasta.trongrid.io"  # Testnet

        self.tron = Tron(HTTPProvider(provider_url, api_key=self.api_key))

        # USDT TRC20 Contract
        self.usdt_contract_address = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
        self.usdt_contract = self.tron.get_contract(self.usdt_contract_address)

        # Main wallet configuration - this is where deposits are received
        self.main_wallet_private_key = os.getenv('TRON_MAIN_WALLET_PRIVATE_KEY')
        self.main_wallet_address = os.getenv('TRON_MAIN_WALLET_ADDRESS', 'TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ')

        # Configuration
        self.min_confirmations = int(os.getenv('MIN_CONFIRMATIONS', '1'))
        self.min_deposit_amount = Decimal(os.getenv('MIN_DEPOSIT_AMOUNT', '10.0'))
        self.max_deposit_amount = Decimal(os.getenv('MAX_DEPOSIT_AMOUNT', '200000.0'))

        # Database configuration
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'database': os.getenv('DB_NAME'),
            'user': os.getenv('DB_USER'),
            'password': os.getenv('DB_PASSWORD'),
            'port': int(os.getenv('DB_PORT', 5432))
        }

        # Supabase configuration for API calls
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        logger.info(f"TRC20 Service initialized for {self.network}")
        logger.info(f"Main wallet address: {self.main_wallet_address}")
        logger.info(f"Min confirmations: {self.min_confirmations}")
        logger.info(f"Deposit limits: {self.min_deposit_amount} - {self.max_deposit_amount} USDT")

    def get_db_connection(self):
        """Get database connection"""
        return psycopg2.connect(**self.db_config)

    def generate_deposit_address(self, user_email: str) -> Dict[str, Any]:
        """Generate a new deposit address for user"""
        try:
            # Generate new private key and address
            private_key = PrivateKey.random()
            address = private_key.public_key.to_base58check_address()
            
            # Store in database (encrypted private key)
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO trc20_deposit_addresses 
                        (user_email, address, private_key_encrypted, created_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (user_email) 
                        DO UPDATE SET 
                            address = EXCLUDED.address,
                            private_key_encrypted = EXCLUDED.private_key_encrypted,
                            updated_at = NOW()
                        RETURNING address
                    """, (user_email, address, self._encrypt_private_key(str(private_key)), datetime.now()))
                    
                    result = cur.fetchone()
                    conn.commit()
                    
            logger.info(f"Generated deposit address for {user_email}: {address}")
            return {
                'success': True,
                'address': address,
                'network': 'TRC20',
                'token': 'USDT'
            }
            
        except Exception as e:
            logger.error(f"Error generating deposit address: {e}")
            return {'success': False, 'error': str(e)}

    def monitor_deposits(self):
        """Monitor for incoming USDT deposits to main wallet"""
        try:
            logger.info("Starting deposit monitoring...")

            # Monitor the main wallet address for incoming USDT transactions
            self._check_main_wallet_transactions()

        except Exception as e:
            logger.error(f"Error monitoring deposits: {e}")

    def _check_main_wallet_transactions(self):
        """Check transactions for the main wallet address"""
        try:
            address = self.main_wallet_address
            logger.info(f"Checking transactions for main wallet: {address}")

            # Get recent TRC20 transactions for the main wallet
            # Using TronGrid API to get TRC20 transfers
            api_url = f"https://api.trongrid.io/v1/accounts/{address}/transactions/trc20"
            headers = {}
            if self.api_key:
                headers['TRON-PRO-API-KEY'] = self.api_key

            params = {
                'limit': 50,
                'order_by': 'block_timestamp,desc',
                'contract_address': self.usdt_contract_address
            }

            response = requests.get(api_url, headers=headers, params=params)
            if response.status_code != 200:
                logger.error(f"Failed to fetch transactions: {response.status_code}")
                return

            data = response.json()
            transactions = data.get('data', [])

            logger.info(f"Found {len(transactions)} recent TRC20 transactions")

            for tx in transactions:
                if self._is_usdt_deposit(tx):
                    self._process_deposit_transaction(tx)

        except Exception as e:
            logger.error(f"Error checking main wallet transactions: {e}")

    def _check_address_transactions(self, addr_info: Dict):
        """Check transactions for a specific address"""
        try:
            address = addr_info['address']
            user_email = addr_info['user_email']
            
            # Get USDT transactions for this address
            transactions = self.tron.get_account_transactions(address, limit=50)
            
            for tx in transactions:
                if self._is_usdt_deposit(tx, address):
                    self._process_deposit_transaction(tx, user_email, address)
                    
        except Exception as e:
            logger.error(f"Error checking address {addr_info['address']}: {e}")

    def _is_usdt_deposit(self, tx: Dict) -> bool:
        """Check if transaction is a USDT deposit to our main wallet"""
        try:
            # Check if it's a TRC20 transfer to our main wallet address
            to_address = tx.get('to')
            token_info = tx.get('token_info', {})
            contract_address = token_info.get('address', '')

            # Verify it's USDT contract and sent to our main wallet
            if (contract_address.lower() == self.usdt_contract_address.lower() and
                to_address.lower() == self.main_wallet_address.lower()):

                # Check if we haven't processed this transaction yet
                tx_hash = tx.get('transaction_id')
                if self._is_transaction_processed(tx_hash):
                    return False

                return True

            return False
        except Exception as e:
            logger.error(f"Error checking if USDT deposit: {e}")
            return False

    def _is_transaction_processed(self, tx_hash: str) -> bool:
        """Check if transaction has already been processed"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id FROM deposits
                        WHERE transaction_hash = %s
                        LIMIT 1
                    """, (tx_hash,))
                    return cur.fetchone() is not None
        except Exception as e:
            logger.error(f"Error checking if transaction processed: {e}")
            return True  # Assume processed to avoid duplicates

    def _process_deposit_transaction(self, tx: Dict):
        """Process a confirmed deposit transaction"""
        try:
            tx_hash = tx.get('transaction_id')
            if not tx_hash:
                logger.error("No transaction hash found")
                return

            # Extract transaction details
            amount = self._extract_usdt_amount(tx)
            from_address = tx.get('from', '')
            block_timestamp = tx.get('block_timestamp', 0)

            if amount <= 0:
                logger.warning(f"Invalid amount for transaction {tx_hash}: {amount}")
                return

            # Validate deposit amount
            if amount < self.min_deposit_amount or amount > self.max_deposit_amount:
                logger.warning(f"Deposit amount {amount} outside limits for tx {tx_hash}")
                return

            # Get confirmations
            confirmations = self._get_confirmations(tx_hash)

            logger.info(f"Processing deposit: {amount} USDT from {from_address} (tx: {tx_hash})")

            # Store deposit record in database
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO deposits
                        (user_email, amount, currency, method_id, method_name, network,
                         deposit_address, transaction_hash, confirmation_count,
                         required_confirmations, status, final_amount, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (
                        'system@ticglobal.com',  # Will be updated when user is identified
                        float(amount), 'USD', 'usdt-trc20', 'USDT', 'TRC20',
                        self.main_wallet_address, tx_hash, confirmations,
                        self.min_confirmations, 'pending', float(amount),
                        datetime.fromtimestamp(block_timestamp / 1000) if block_timestamp else datetime.now()
                    ))
                    deposit_id = cur.fetchone()[0]
                    conn.commit()

            # Auto-credit if enough confirmations
            if confirmations >= self.min_confirmations:
                self._auto_credit_deposit(deposit_id, tx_hash, amount)

            logger.info(f"Processed deposit: {amount} USDT (ID: {deposit_id})")

        except Exception as e:
            logger.error(f"Error processing deposit transaction: {e}")

    def _extract_usdt_amount(self, tx: Dict) -> Decimal:
        """Extract USDT amount from transaction"""
        try:
            # Extract amount from TronGrid API response
            value = tx.get('value', '0')
            if isinstance(value, str):
                # USDT has 6 decimals, so divide by 1,000,000
                amount = Decimal(value) / Decimal('1000000')
            else:
                amount = Decimal(str(value)) / Decimal('1000000')

            return amount
        except Exception as e:
            logger.error(f"Error extracting USDT amount: {e}")
            return Decimal('0.0')

    def _get_confirmations(self, tx_hash: str) -> int:
        """Get number of confirmations for transaction"""
        try:
            tx_info = self.tron.get_transaction(tx_hash)
            if 'blockNumber' in tx_info:
                current_block = self.tron.get_latest_solid_block_number()
                return current_block - tx_info['blockNumber']
            return 0
        except Exception as e:
            logger.error(f"Error getting confirmations: {e}")
            return 0

    def _credit_user_wallet(self, user_email: str, amount: Decimal, tx_hash: str):
        """Credit user's wallet with deposited amount"""
        try:
            # Call your existing wallet credit function
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT credit_user_wallet(%s, %s, %s, %s)
                    """, (user_email, float(amount), tx_hash, 'TRC20 USDT Deposit'))
                    conn.commit()
            
            # Update deposit status
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE trc20_deposits 
                        SET status = 'completed', completed_at = NOW()
                        WHERE transaction_hash = %s
                    """, (tx_hash,))
                    conn.commit()
                    
            logger.info(f"Credited {amount} USDT to {user_email}")
            
        except Exception as e:
            logger.error(f"Error crediting wallet: {e}")

    def _auto_credit_deposit(self, deposit_id: str, tx_hash: str, amount: Decimal):
        """Auto-credit deposit to system (since we don't know the user yet)"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Update deposit status to completed
                    cur.execute("""
                        UPDATE deposits
                        SET status = 'completed',
                            updated_at = %s,
                            admin_notes = 'Auto-credited by TRC20 automation service'
                        WHERE id = %s
                    """, (datetime.now(), deposit_id))

                    conn.commit()

            logger.info(f"Auto-credited deposit {deposit_id}: {amount} USDT (tx: {tx_hash})")

            # Notify admin about the deposit
            self._notify_admin_deposit(deposit_id, tx_hash, amount)

        except Exception as e:
            logger.error(f"Error auto-crediting deposit: {e}")

    def _notify_admin_deposit(self, deposit_id: str, tx_hash: str, amount: Decimal):
        """Notify admin about new deposit"""
        try:
            # This could send an email, webhook, or API call to notify admin
            logger.info(f"ADMIN NOTIFICATION: New deposit {deposit_id} - {amount} USDT (tx: {tx_hash})")

            # You could implement email notification here
            # or call a webhook to notify the admin dashboard

        except Exception as e:
            logger.error(f"Error notifying admin: {e}")

    def process_withdrawal(self, withdrawal_id: str) -> Dict[str, Any]:
        """Process a withdrawal request"""
        try:
            # Get withdrawal details
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM trc20_withdrawals 
                        WHERE id = %s AND status = 'pending'
                    """, (withdrawal_id,))
                    withdrawal = cur.fetchone()
            
            if not withdrawal:
                return {'success': False, 'error': 'Withdrawal not found'}
            
            # Create and send transaction
            private_key = PrivateKey(bytes.fromhex(self.main_wallet_private_key))
            
            # Build USDT transfer transaction
            txn = (
                self.usdt_contract.functions.transfer(
                    withdrawal['to_address'],
                    int(withdrawal['amount'] * 1_000_000)  # USDT has 6 decimals
                )
                .with_owner(self.main_wallet_address)
                .fee_limit(50_000_000)  # 50 TRX fee limit
                .build()
                .sign(private_key)
            )
            
            # Broadcast transaction
            result = txn.broadcast()
            
            if result['result']:
                tx_hash = result['txid']
                
                # Update withdrawal status
                with self.get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            UPDATE trc20_withdrawals 
                            SET status = 'broadcasted', 
                                transaction_hash = %s,
                                broadcasted_at = NOW()
                            WHERE id = %s
                        """, (tx_hash, withdrawal_id))
                        conn.commit()
                
                logger.info(f"Withdrawal broadcasted: {tx_hash}")
                return {
                    'success': True,
                    'transaction_hash': tx_hash,
                    'message': 'Withdrawal broadcasted successfully'
                }
            else:
                return {'success': False, 'error': 'Failed to broadcast transaction'}
                
        except Exception as e:
            logger.error(f"Error processing withdrawal: {e}")
            return {'success': False, 'error': str(e)}

    def _encrypt_private_key(self, private_key: str) -> str:
        """Encrypt private key for storage (implement proper encryption)"""
        # TODO: Implement proper encryption
        return private_key

    def start_monitoring(self):
        """Start the monitoring service"""
        logger.info("Starting TRC20 monitoring service...")
        
        while True:
            try:
                self.monitor_deposits()
                time.sleep(30)  # Check every 30 seconds
            except KeyboardInterrupt:
                logger.info("Monitoring service stopped")
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(60)  # Wait longer on error

if __name__ == "__main__":
    service = TRC20AutomationService()
    service.start_monitoring()
