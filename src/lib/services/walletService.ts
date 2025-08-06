import { createClient } from '@/lib/supabase/client';
import NotificationService from './notificationService';
import { getSession } from 'next-auth/react';

export interface WalletBalance {
  total: number;
  tic: number;
  gic: number;
  staking: number;
  partner_wallet: number;
  lastUpdated: Date;
}

class WalletService {
  private static instance: WalletService;
  private supabase = createClient();
  private balanceCache: WalletBalance | null = null;
  private listeners: Set<(balance: WalletBalance) => void> = new Set();

  private constructor() {}

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  // Subscribe to balance updates
  subscribe(callback: (balance: WalletBalance) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners of balance changes
  private notifyListeners(balance: WalletBalance) {
    this.listeners.forEach(callback => callback(balance));
  }

  // Helper method to get authenticated user email from both auth methods
  async getAuthenticatedUserEmail(): Promise<string | null> {
    try {
      // Method 1: Try NextAuth session (Google OAuth)
      const nextAuthSession = await getSession();
      if (nextAuthSession?.user?.email) {
        console.log('🔍 Found NextAuth user:', nextAuthSession.user.email);
        return nextAuthSession.user.email;
      }

      // Method 2: Try Supabase auth (manual login)
      const { data: { user: supabaseUser } } = await this.supabase.auth.getUser();
      if (supabaseUser?.email) {
        console.log('🔍 Found Supabase user:', supabaseUser.email);
        return supabaseUser.email;
      }

      console.log('❌ No authenticated user found in either system');
      return null;
    } catch (error) {
      console.error('Error getting authenticated user:', error);
      return null;
    }
  }

  // Get current wallet balance (automatically syncs with transactions)
  async getBalance(): Promise<WalletBalance> {
    try {
      const userEmail = await this.getAuthenticatedUserEmail();

      if (!userEmail) {
        const emptyBalance: WalletBalance = {
          total: 0,
          tic: 0,
          gic: 0,
          staking: 0,
          partner_wallet: 0,
          lastUpdated: new Date()
        };
        return emptyBalance;
      }

      // Use direct query method since get_current_user_balance() doesn't work with Google OAuth
      return this.getBalanceDirectQuery(userEmail);

    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      const errorBalance: WalletBalance = {
        total: 0,
        tic: 0,
        gic: 0,
        staking: 0,
        partner_wallet: 0,
        lastUpdated: new Date()
      };
      return errorBalance;
    }
  }

  // Fallback method for direct wallet query
  private async getBalanceDirectQuery(userEmail: string): Promise<WalletBalance> {
    try {
      // Skip automatic sync to prevent unexpected balance changes
      console.log('📊 Getting wallet balance for:', userEmail, '(sync disabled)');

      // Note: Automatic sync disabled to prevent user confusion
      // Manual sync can be triggered via /api/wallet/sync if needed

      // Then get the updated balance directly from database
      const { data, error } = await this.supabase
        .from('user_wallets')
        .select('*')
        .eq('user_email', userEmail)
        .maybeSingle();

      if (error) {
        console.error('Error in direct wallet query:', error);
        return this.getBalanceFromLocalStorage(userEmail);
      }

      if (data) {
        const balance: WalletBalance = {
          total: parseFloat(data.total_balance) || 0,
          tic: parseFloat(data.tic_balance) || 0,
          gic: parseFloat(data.gic_balance) || 0,
          staking: parseFloat(data.staking_balance) || 0,
          partner_wallet: parseFloat(data.partner_wallet_balance) || 0,
          lastUpdated: new Date(data.last_updated)
        };

        this.balanceCache = balance;
        return balance;
      }

      // Create wallet if it doesn't exist
      const { error: createError } = await this.supabase
        .rpc('get_or_create_user_wallet', {
          user_email_param: userEmail
        });

      if (createError) {
        console.error('Error creating wallet:', createError);
        return this.getBalanceFromLocalStorage(userEmail);
      }

      const balance: WalletBalance = {
        total: 0,
        tic: 0,
        gic: 0,
        staking: 0,
        partner_wallet: 0,
        lastUpdated: new Date()
      };

      this.balanceCache = balance;
      return balance;

    } catch (error) {
      console.error('Error in direct balance query:', error);
      return this.getBalanceFromLocalStorage(userEmail);
    }
  }

  // Fallback method for localStorage (backward compatibility)
  private getBalanceFromLocalStorage(userId: string): WalletBalance {
    try {
      const balanceKey = `simulatedBalance_${userId}`;
      const storedBalance = localStorage.getItem(balanceKey);

      if (storedBalance) {
        const total = parseFloat(storedBalance);
        return {
          total,
          tic: total * 0.6, // 60% TIC
          gic: total * 0.3, // 30% GIC
          staking: total * 0.1, // 10% Staking
          partner_wallet: 0, // Partner wallet not stored in localStorage
          lastUpdated: new Date()
        };
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }

    return {
      total: 0,
      tic: 0,
      gic: 0,
      staking: 0,
      partner_wallet: 0,
      lastUpdated: new Date()
    };
  }

  // Update wallet balance (for deposits, payments, etc.)
  async updateBalance(amount: number, type: 'deposit' | 'payment' | 'withdrawal', transactionId?: string): Promise<WalletBalance> {
    try {
      const userEmail = await this.getAuthenticatedUserEmail();

      if (!userEmail) {
        throw new Error('User not authenticated');
      }

      // Get current balance for reference (not used in RPC functions)
      // const currentBalance = await this.getBalance();

      // For withdrawals and payments, use the database debit function
      if (type === 'withdrawal' || type === 'payment') {
        const { error } = await this.supabase
          .rpc('debit_user_wallet', {
            user_email_param: userEmail,
            amount_param: amount,
            transaction_id_param: transactionId || null,
            transaction_type_param: type,
            description_param: `${type === 'payment' ? 'Payment' : 'Withdrawal'}: $${amount}`
          });

        if (error) {
          console.error('Error debiting wallet:', error);
          throw new Error(error.message || 'Failed to update wallet balance');
        }
      }
      // For deposits, use the database credit function
      else if (type === 'deposit') {
        const { error } = await this.supabase
          .rpc('credit_user_wallet', {
            user_email_param: userEmail,
            amount_param: amount,
            transaction_id_param: transactionId || null,
            description_param: `Deposit: $${amount}`
          });

        if (error) {
          console.error('Error crediting wallet:', error);
          throw new Error(error.message || 'Failed to update wallet balance');
        }
      }

      // Get updated balance from database
      const newBalance = await this.getBalance();

      // Update cache
      this.balanceCache = newBalance;

      // Notify all listeners
      this.notifyListeners(newBalance);

      // Dispatch custom event for backward compatibility
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { balance: newBalance, type, amount }
        }));
      }

      // Create notification for transaction
      try {
        const notificationTransactionId = transactionId || `txn_${Date.now()}`;
        switch (type) {
          case 'deposit':
            await NotificationService.createTransactionNotification(userEmail, 'deposit', amount, 'USD', notificationTransactionId);
            break;
          case 'withdrawal':
            await NotificationService.createTransactionNotification(userEmail, 'withdrawal', amount, 'USD', notificationTransactionId);
            break;
          case 'payment':
            await NotificationService.createTransactionNotification(userEmail, 'payment', amount, 'USD', notificationTransactionId);
            break;
        }
      } catch (error) {
        console.error('Error creating transaction notification:', error);
        // Don't fail the transaction if notification fails
      }

      return newBalance;

    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  }

  // Process plan payment using the payments API
  async processPayment(planId: string, planName: string): Promise<{ success: boolean; message: string; newBalance?: WalletBalance; transaction?: any }> {
    try {
      const userEmail = await this.getAuthenticatedUserEmail();

      if (!userEmail) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      // Use the payments API (userEmail is now obtained from session server-side)
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planId
        })
      });

      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          message: data.error || 'Payment failed'
        };
      }

      // Refresh balance after payment
      const newBalance = await this.refreshBalance();

      return {
        success: true,
        message: data.message || `Payment successful! ${planName} activated.`,
        newBalance,
        transaction: data.transaction
      };

    } catch (error) {
      console.error('Error processing payment:', error);
      return {
        success: false,
        message: 'Payment failed. Please try again.'
      };
    }
  }

  // Process withdrawal using the withdrawals API
  async processWithdrawal(amount: number, address: string, methodId: string): Promise<{ success: boolean; message: string; newBalance?: WalletBalance; withdrawal?: any }> {
    try {
      const userEmail = await this.getAuthenticatedUserEmail();

      if (!userEmail) {
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      // Use the withdrawals API
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId: methodId,
          destinationAddress: address,
          amount: amount
        })
      });

      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          message: data.error || 'Withdrawal failed'
        };
      }

      // Refresh balance after withdrawal
      const newBalance = await this.refreshBalance();

      return {
        success: true,
        message: data.message || 'Withdrawal request submitted successfully!',
        newBalance,
        withdrawal: data.withdrawal
      };

    } catch (error) {
      console.error('Error processing withdrawal:', error);
      return {
        success: false,
        message: 'Withdrawal failed. Please try again.'
      };
    }
  }

  // Check if user has sufficient balance for a plan
  async hasSufficientBalance(requiredAmount: number): Promise<boolean> {
    const balance = await this.getBalance();
    return balance.total >= requiredAmount;
  }

  // Get cached balance (synchronous)
  getCachedBalance(): WalletBalance | null {
    return this.balanceCache;
  }

  // Refresh balance and notify listeners
  async refreshBalance(): Promise<WalletBalance> {
    const balance = await this.getBalance();
    this.notifyListeners(balance);
    return balance;
  }

  // Force refresh balance by clearing cache and re-fetching
  async forceRefreshBalance(): Promise<WalletBalance> {
    console.log('🔄 Force refreshing wallet balance...');

    // Clear cache
    this.balanceCache = null;

    // Get fresh balance
    const balance = await this.getBalance();

    // Notify all listeners
    this.notifyListeners(balance);

    console.log('✅ Force refresh completed:', balance);
    return balance;
  }

  // Get user's active subscriptions
  async getActiveSubscriptions(): Promise<any[]> {
    try {
      const userEmail = await this.getAuthenticatedUserEmail();

      if (!userEmail) {
        return [];
      }

      const { data, error } = await this.supabase
        .rpc('get_user_active_subscriptions', {
          user_email_param: userEmail
        });

      if (error) {
        console.error('Error fetching active subscriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting active subscriptions:', error);
      return [];
    }
  }

  // Transfer from partner wallet to main wallet
  async transferPartnerToMainWallet(amount: number): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const userEmail = await this.getAuthenticatedUserEmail();

      if (!userEmail) {
        return { success: false, message: 'User not authenticated' };
      }

      if (amount <= 0) {
        return { success: false, message: 'Transfer amount must be greater than 0' };
      }

      // Call the database function to transfer
      const { data, error } = await this.supabase
        .rpc('transfer_partner_to_main_wallet', {
          user_email_param: userEmail,
          transfer_amount_param: amount
        });

      if (error) {
        console.error('Error transferring from partner wallet:', error);
        return { success: false, message: error.message || 'Transfer failed' };
      }

      // Refresh balance after transfer
      await this.forceRefreshBalance();

      return {
        success: true,
        message: `Successfully transferred $${amount.toFixed(2)} from Partner Wallet to Main Wallet`,
        data: { amount, userEmail }
      };

    } catch (error) {
      console.error('Error in partner wallet transfer:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Transfer failed'
      };
    }
  }

  // Get user's payment history
  async getPaymentHistory(limit: number = 20): Promise<any[]> {
    try {
      const userEmail = await this.getAuthenticatedUserEmail();

      if (!userEmail) {
        return [];
      }

      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_email', userEmail)
        .eq('transaction_type', 'payment')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching payment history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }

  // Get user's withdrawal history
  async getWithdrawalHistory(limit: number = 20): Promise<any[]> {
    try {
      const userEmail = await this.getAuthenticatedUserEmail();

      if (!userEmail) {
        return [];
      }

      const { data, error } = await this.supabase
        .from('withdrawal_requests')
        .select(`
          *,
          payment_methods (
            name,
            network,
            symbol
          )
        `)
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching withdrawal history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting withdrawal history:', error);
      return [];
    }
  }

  // Get wallet transaction history
  async getWalletTransactions(limit: number = 50): Promise<any[]> {
    try {
      const userEmail = await this.getAuthenticatedUserEmail();

      if (!userEmail) {
        return [];
      }

      const { data, error } = await this.supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching wallet transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      return [];
    }
  }

  // Get available payment plans
  async getPaymentPlans(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('payment_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching payment plans:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting payment plans:', error);
      return [];
    }
  }

  // Get available withdrawal methods
  async getWithdrawalMethods(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching withdrawal methods:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting withdrawal methods:', error);
      return [];
    }
  }
}

export default WalletService;
