import { createClient } from '@/lib/supabase/client';
import NotificationService from './notificationService';

export interface Transaction {
  id: string;
  user_email: string;
  transaction_type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  network: string;
  wallet_address?: string;
  user_wallet_address?: string;
  transaction_hash?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  processing_fee: number;
  network_fee: number;
  final_amount?: number;
  user_ip_address?: string;
  user_agent?: string;
  request_metadata?: any;
}

export interface AdminNotification {
  id: string;
  transaction_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  read_at?: string;
  transaction_amount?: number;
  transaction_user?: string;
  transaction_network?: string;
}

export interface CreateTransactionRequest {
  user_email: string;
  transaction_type: 'deposit' | 'withdrawal';
  amount: number;
  currency?: string;
  network: string;
  wallet_address?: string;
  user_wallet_address?: string;
  processing_fee?: number;
  network_fee?: number;
  request_metadata?: any;
}

class TransactionService {
  private static instance: TransactionService;
  private supabase = createClient();

  static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  // Create a new transaction (deposit or withdrawal request)
  async createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
    try {
      // Get user IP and user agent (in a real app, you'd get this from the request)
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : 'Unknown';
      
      const final_amount = request.amount - (request.processing_fee || 0) - (request.network_fee || 0);

      const { data, error } = await this.supabase
        .from('transactions')
        .insert({
          user_email: request.user_email,
          transaction_type: request.transaction_type,
          amount: request.amount,
          currency: request.currency || 'USD',
          network: request.network,
          wallet_address: request.wallet_address,
          user_wallet_address: request.user_wallet_address,
          processing_fee: request.processing_fee || 0,
          network_fee: request.network_fee || 0,
          final_amount: final_amount,
          user_agent: userAgent,
          request_metadata: request.request_metadata || {},
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        throw new Error(`Failed to create transaction: ${error.message}`);
      }

      // Send email notification to admin
      await this.sendAdminEmailNotification(data);

      return data;
    } catch (error) {
      console.error('Error in createTransaction:', error);
      throw error;
    }
  }

  // Get user's transactions
  async getUserTransactions(userEmail: string): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user transactions:', error);
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserTransactions:', error);
      throw error;
    }
  }

  // Get pending transactions for admin
  async getPendingTransactions(): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_pending_transactions');

      if (error) {
        console.error('Error fetching pending transactions:', error);
        throw new Error(`Failed to fetch pending transactions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPendingTransactions:', error);
      throw error;
    }
  }

  // Update transaction status (admin function)
  async updateTransactionStatus(
    transactionId: string,
    status: 'approved' | 'rejected' | 'completed' | 'failed',
    adminEmail: string,
    adminNotes?: string
  ): Promise<boolean> {
    try {
      // First, get the current deposit details before updating
      const { data: currentDeposit, error: fetchError } = await this.supabase
        .from('deposits')
        .select('user_email, amount, final_amount, currency, network, status')
        .eq('id', transactionId)
        .single();

      if (fetchError) {
        console.error('Error fetching deposit details:', fetchError);
        throw new Error(`Failed to fetch deposit: ${fetchError.message}`);
      }

      // Update the deposit status
      const updateData: any = {
        status: status === 'approved' ? 'completed' : status,
        admin_email: adminEmail,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      };

      // Set approval/rejection timestamps
      if (status === 'approved' || status === 'completed') {
        updateData.approved_by = adminEmail;
        updateData.approved_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_by = adminEmail;
        updateData.rejected_at = new Date().toISOString();
      }

      const { data: updatedDeposit, error } = await this.supabase
        .from('deposits')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating deposit status:', error);
        throw new Error(`Failed to update deposit: ${error.message}`);
      }

      // If status is completed and it wasn't completed before, credit the user's wallet
      const finalStatus = status === 'approved' ? 'completed' : status;
      if (finalStatus === 'completed' && currentDeposit.status !== 'completed') {
        try {
          console.log(`💰 Crediting wallet for completed deposit: ${transactionId}`);

          // Check if this deposit has already been credited to prevent duplicates
          const { data: existingTransaction } = await this.supabase
            .from('wallet_transactions')
            .select('id')
            .eq('transaction_id', transactionId)
            .eq('transaction_type', 'deposit')
            .single();

          if (existingTransaction) {
            console.log(`⚠️ Deposit ${transactionId} already credited to wallet, skipping duplicate credit`);
          } else {
            // Use final_amount if available, otherwise use original amount
            const creditAmount = updatedDeposit.final_amount || updatedDeposit.amount;

            if (!creditAmount || creditAmount <= 0) {
              throw new Error(`Invalid credit amount: ${creditAmount}`);
            }

            // Credit the wallet using the database function
            const { error: creditError } = await this.supabase
              .rpc('credit_user_wallet', {
                user_email_param: updatedDeposit.user_email,
                amount_param: creditAmount,
                transaction_id_param: transactionId,
                description_param: `Deposit completed: $${creditAmount} via ${updatedDeposit.network || 'Unknown'}`
              });

            if (creditError) {
              console.error('Error crediting wallet for deposit:', creditError);
              throw new Error(`Failed to credit wallet: ${creditError.message}`);
            }

            console.log(`✅ Successfully credited $${creditAmount} to ${updatedDeposit.user_email}'s wallet`);
          }

        } catch (walletError) {
          console.error('Error crediting wallet for deposit:', walletError);

          // Revert the deposit status back to previous state if wallet credit fails
          await this.supabase
            .from('deposits')
            .update({
              status: currentDeposit.status,
              admin_notes: `Wallet credit failed: ${walletError}. Original notes: ${adminNotes || ''}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', transactionId);

          throw new Error(`Failed to credit wallet: ${walletError}. Deposit status reverted.`);
        }
      }

      // Create user notification for status change
      if (currentDeposit?.user_email) {
        try {
          const notificationStatus = status === 'approved' ? 'completed' : status;

          if (notificationStatus === 'completed') {
            await NotificationService.createTransactionNotification(
              currentDeposit.user_email,
              'deposit',
              currentDeposit.amount || 0,
              currentDeposit.currency || 'USD',
              transactionId
            );
          } else if (notificationStatus === 'rejected') {
            // Create rejection notification with support link
            await NotificationService.createNotification({
              user_email: currentDeposit.user_email,
              title: 'Deposit Rejected',
              message: `Your deposit of $${(currentDeposit.amount || 0).toFixed(2)} ${currentDeposit.currency || 'USD'} was not approved. Please save your transaction ID for reference and contact support for assistance.`,
              type: 'deposit',
              priority: 'high',
              action_url: `/support-hub?transactionId=${transactionId}&issueType=deposit-rejected&amount=${currentDeposit.amount || 0}`,
              metadata: {
                transaction_id: transactionId,
                amount: currentDeposit.amount || 0,
                currency: currentDeposit.currency || 'USD',
                status: 'rejected',
                admin_notes: adminNotes,
                timestamp: new Date().toISOString()
              }
            });
          }
        } catch (notificationError) {
          console.error('Error creating user notification:', notificationError);
          // Don't fail the transaction update if notification fails
        }
      }

      return true;
    } catch (error) {
      console.error('Error in updateTransactionStatus:', error);
      throw error;
    }
  }

  // Get admin notifications
  async getAdminNotifications(limit: number = 50): Promise<AdminNotification[]> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_admin_notifications', { limit_count: limit });

      if (error) {
        console.error('Error fetching admin notifications:', error);
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAdminNotifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw new Error(`Failed to mark notification as read: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      throw error;
    }
  }

  // Send email notification to admin
  private async sendAdminEmailNotification(transaction: Transaction): Promise<void> {
    try {
      const response = await fetch('/api/admin/notify-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: transaction
        }),
      });

      if (!response.ok) {
        console.error('Failed to send admin email notification');
      }
    } catch (error) {
      console.error('Error sending admin email notification:', error);
    }
  }

  // Get transaction statistics
  async getTransactionStats(): Promise<{
    total_pending: number;
    total_deposits_today: number;
    total_withdrawals_today: number;
    pending_amount: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [pendingResult, depositsResult, withdrawalsResult, pendingAmountResult] = await Promise.all([
        this.supabase
          .from('transactions')
          .select('id', { count: 'exact' })
          .eq('status', 'pending'),
        
        this.supabase
          .from('transactions')
          .select('id', { count: 'exact' })
          .eq('transaction_type', 'deposit')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`),
        
        this.supabase
          .from('transactions')
          .select('id', { count: 'exact' })
          .eq('transaction_type', 'withdrawal')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`),
        
        this.supabase
          .from('transactions')
          .select('amount')
          .eq('status', 'pending')
      ]);

      const pendingAmount = pendingAmountResult.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      return {
        total_pending: pendingResult.count || 0,
        total_deposits_today: depositsResult.count || 0,
        total_withdrawals_today: withdrawalsResult.count || 0,
        pending_amount: pendingAmount
      };
    } catch (error) {
      console.error('Error getting transaction stats:', error);
      return {
        total_pending: 0,
        total_deposits_today: 0,
        total_withdrawals_today: 0,
        pending_amount: 0
      };
    }
  }

  // Subscribe to real-time transaction updates
  subscribeToTransactions(callback: (payload: any) => void) {
    return this.supabase
      .channel('transactions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' }, 
        callback
      )
      .subscribe();
  }

  // Subscribe to real-time admin notifications
  subscribeToAdminNotifications(callback: (payload: any) => void) {
    return this.supabase
      .channel('admin_notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'admin_notifications' }, 
        callback
      )
      .subscribe();
  }
}

export default TransactionService;
