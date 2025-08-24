import { createClient } from '@/lib/supabase/client';
import NotificationService from './notificationService';
import { getSession } from 'next-auth/react';

export interface WalletBalance {
  total: number;
  tic: number;
  gic: number;
  staking: number;
  partner_wallet: number;
  portfolio_value?: number; // Stable total value that doesn't change with internal transfers
  lastUpdated: Date;
}

class WalletService {
  private static instance: WalletService;
  private supabase = createClient();
  private balanceCache: WalletBalance | null = null;
  private listeners: Set<(balance: WalletBalance) => void> = new Set();

  // ✅ CACHING & IN-FLIGHT PROTECTION
  private inFlight: Promise<WalletBalance> | null = null;
  private lastFetch: { at: number; data: WalletBalance } | null = null;
  private TTL = 10_000; // 10 seconds cache TTL

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
  notifyListeners(balance: WalletBalance) {
    this.listeners.forEach(callback => callback(balance));
  }

  // Helper method to get authenticated user email from both auth methods (same as navbar)
  async getAuthenticatedUserEmail(): Promise<string | null> {
    try {
      console.log('🔍 WalletService: Getting authenticated user...');

      // Method 1: Try NextAuth session (Google OAuth) - same as navbar
      const nextAuthSession = await getSession();
      if (nextAuthSession?.user?.email) {
        console.log('🔍 WalletService: Found NextAuth user:', nextAuthSession.user.email);
        return nextAuthSession.user.email;
      }

      // Method 2: Try Supabase auth (manual login) - same as navbar
      const { data: { user: supabaseUser } } = await this.supabase.auth.getUser();
      if (supabaseUser?.email) {
        console.log('🔍 WalletService: Found Supabase user:', supabaseUser.email);
        return supabaseUser.email;
      }

      console.log('❌ WalletService: No authenticated user found in either system');
      return null;
    } catch (error) {
      console.error('❌ WalletService: Error getting authenticated user:', error);
      return null;
    }
  }

  // ✅ CACHED BALANCE METHOD - DE-DUPLICATES CALLS + TTL CACHE
  async getBalanceCached(force = false): Promise<WalletBalance> {
    const now = Date.now();

    // Return cached data if within TTL and not forcing refresh
    if (!force && this.lastFetch && now - this.lastFetch.at < this.TTL) {
      console.log('🔄 WalletService: Returning cached balance (TTL not expired)');
      return this.lastFetch.data;
    }

    // Return in-flight promise if one exists (de-duplicate concurrent calls)
    if (this.inFlight) {
      console.log('🔄 WalletService: Returning in-flight promise (de-duplicating call)');
      return this.inFlight;
    }

    // Create new in-flight promise
    this.inFlight = this.getBalance()
      .then((data) => {
        this.lastFetch = { at: Date.now(), data };
        this.balanceCache = data; // Update existing cache too
        return data;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  // Get current wallet balance (using same API as navbar for consistency)
  async getBalance(): Promise<WalletBalance> {
    try {
      console.log('🔄 WalletService: Getting balance...');

      // Check cache first
      if (this.lastFetch && (Date.now() - this.lastFetch.at) < this.TTL) {
        console.log('✅ WalletService: Returning cached balance');
        return this.lastFetch.data;
      }

      // If already fetching, return the in-flight promise
      if (this.inFlight) {
        console.log('⏳ WalletService: Returning in-flight promise');
        return this.inFlight;
      }

      const userEmail = await this.getAuthenticatedUserEmail();

      if (!userEmail) {
        console.log('❌ WalletService: No user email, returning empty balance');
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

      // Create in-flight promise and fetch balance
      this.inFlight = this.getBalanceFromAPI(userEmail);

      try {
        const balance = await this.inFlight;

        // Cache the result
        this.lastFetch = { at: Date.now(), data: balance };

        return balance;
      } finally {
        // Clear in-flight promise
        this.inFlight = null;
      }

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

  // New method: Get balance from API (same as navbar)
  private async getBalanceFromAPI(userEmail: string): Promise<WalletBalance> {
    try {
      console.log('🔄 WalletService: Calling balance API for:', userEmail);

      // Use the same API endpoint as the navbar
      const response = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail })
      });

      console.log('🔍 WalletService: API response status:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 WalletService: API response data:', data);

        if (data.wallet) {
          const w = data.wallet;
          const balance: WalletBalance = {
            total: Number(w.total_balance) || 0,
            tic: Number(w.tic_balance) || 0,
            gic: Number(w.gic_balance) || 0,
            staking: Number(w.staking_balance) || 0,
            partner_wallet: Number(w.partner_wallet_balance) || 0,
            lastUpdated: w.last_updated ? new Date(w.last_updated) : new Date()
          };

          console.log('✅ WalletService: Balance loaded from API:', balance);

          // Update cache
          this.balanceCache = balance;

          return balance;
        } else {
          console.error('❌ WalletService: No wallet data in API response');
          throw new Error('No wallet data in response');
        }
      } else {
        console.error('❌ WalletService: API request failed:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ WalletService: Error details:', errorData);
        throw new Error(`API request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ WalletService: Error calling balance API:', error);
      // Fallback to direct query method
      return this.getBalanceDirectQuery(userEmail);
    }
  }

  // Fallback method for direct wallet query
  private async getBalanceDirectQuery(userEmail: string): Promise<WalletBalance> {
    try {
      console.log('🔄 WalletService: Using fallback direct query for:', userEmail);
      console.log('⚠️ WalletService: API failed, falling back to direct database query');

      // Note: Automatic sync disabled to prevent user confusion
      // Manual sync can be triggered via /api/wallet/sync if needed

      // Get calculated balance from transactions (same as balance API)
      const { data: calculatedData, error: calculatedError } = await this.supabase
        .rpc('get_calculated_wallet_balance', {
          user_email_param: userEmail
        });

      // Also get token balances from user_wallets table
      const { data: walletData, error: walletError } = await this.supabase
        .from('user_wallets')
        .select('tic_balance, gic_balance, staking_balance, partner_wallet_balance, last_updated')
        .eq('user_email', userEmail)
        .maybeSingle();

      if (calculatedError) {
        console.error('Error getting calculated balance:', calculatedError);
        return this.getBalanceFromLocalStorage(userEmail);
      }

      const calculated = calculatedData?.[0];
      const totalBalance = parseFloat(calculated?.total_balance?.toString() || '0');

      if (calculated || walletData) {
        const balance: WalletBalance = {
          total: totalBalance,
          tic: parseFloat(walletData?.tic_balance || '0'),
          gic: parseFloat(walletData?.gic_balance || '0'),
          staking: parseFloat(walletData?.staking_balance || '0'),
          partner_wallet: parseFloat(walletData?.partner_wallet_balance || '0'),
          portfolio_value: undefined,
          lastUpdated: walletData?.last_updated ? new Date(walletData.last_updated) : new Date()
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
      console.log('🔍 WalletService: Starting payment process for plan:', planId);
      const userEmail = await this.getAuthenticatedUserEmail();
      console.log('🔍 WalletService: User email from auth check:', userEmail);

      if (!userEmail) {
        console.log('❌ WalletService: No user email found, payment cannot proceed');
        return {
          success: false,
          message: 'User not authenticated'
        };
      }

      // Use the payments API (userEmail is now obtained from session server-side)
      console.log('🔍 WalletService: Making API call to /api/payments with planId:', planId);
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planId
        })
      });

      console.log('🔍 WalletService: API response status:', response.status);
      const data = await response.json();
      console.log('🔍 WalletService: API response data:', data);

      if (!data.success) {
        return {
          success: false,
          message: data.error || 'Payment failed'
        };
      }

      // Force refresh balance after payment to ensure UI updates immediately
      console.log('🔄 Force refreshing balance after payment...');
      const newBalance = await this.forceRefreshBalance();
      console.log('✅ Balance refreshed after payment:', newBalance);

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

    // Clear all caches
    this.balanceCache = null;
    this.lastFetch = null; // Clear TTL cache
    this.inFlight = null; // Clear in-flight promise

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
