/**
 * Balance Synchronization Utility
 *
 * This utility ensures that wallet balance is automatically synchronized
 * across all components after any transaction (deposits, withdrawals, transfers, payments).
 */

import WalletService, { WalletBalance } from '@/lib/services/walletService';

export class BalanceSyncManager {
  private static instance: BalanceSyncManager;
  private walletService: WalletService;
  private syncInProgress = false;

  private constructor() {
    this.walletService = WalletService.getInstance();
  }

  static getInstance(): BalanceSyncManager {
    if (!BalanceSyncManager.instance) {
      BalanceSyncManager.instance = new BalanceSyncManager();
    }
    return BalanceSyncManager.instance;
  }

  /**
   * Trigger automatic balance sync after any transaction
   * @param transactionType - Type of transaction that occurred
   * @param amount - Transaction amount (optional, for logging)
   * @param delay - Delay before sync in milliseconds (default: 1000ms)
   */
  async syncAfterTransaction(
    transactionType: 'deposit' | 'withdrawal' | 'transfer' | 'payment',
    amount?: number,
    delay: number = 1000
  ): Promise<WalletBalance> {
    // Prevent multiple simultaneous syncs
    if (this.syncInProgress) {
      console.log('⏳ Balance sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;

    try {
      console.log(`🔄 Auto-syncing balance after ${transactionType}${amount ? ` of $${amount}` : ''}...`);

      // Add a small delay to ensure database operations are complete
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Force refresh balance and notify all listeners
      const newBalance = await this.walletService.forceRefreshBalance();
      
      console.log(`✅ Balance auto-synced after ${transactionType}:`, newBalance);
      
      return newBalance;
    } catch (error) {
      console.error(`❌ Failed to auto-sync balance after ${transactionType}:`, error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Manual balance refresh (for user-triggered refreshes)
   */
  async manualRefresh(): Promise<WalletBalance> {
    console.log('🔄 Manual balance refresh triggered...');
    try {
      const newBalance = await this.walletService.forceRefreshBalance();
      console.log('✅ Manual balance refresh completed:', newBalance);
      return newBalance;
    } catch (error) {
      console.error('❌ Manual balance refresh failed:', error);
      throw error;
    }
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }
}

// Export singleton instance for easy access
export const balanceSyncManager = BalanceSyncManager.getInstance();

// Convenience functions for different transaction types
export const syncAfterDeposit = (amount?: number) => 
  balanceSyncManager.syncAfterTransaction('deposit', amount);

export const syncAfterWithdrawal = (amount?: number) => 
  balanceSyncManager.syncAfterTransaction('withdrawal', amount);

export const syncAfterTransfer = (amount?: number) => 
  balanceSyncManager.syncAfterTransaction('transfer', amount);

export const syncAfterPayment = (amount?: number) => 
  balanceSyncManager.syncAfterTransaction('payment', amount);

export const manualBalanceRefresh = () => 
  balanceSyncManager.manualRefresh();
