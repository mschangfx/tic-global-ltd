import { createClient } from '@supabase/supabase-js';
import WalletService from './walletService';

export interface DepositData {
  user_email: string;
  user_id?: string;
  amount: number;
  currency?: string;
  method_id: string;
  method_name: string;
  network: string;
  deposit_address: string;
  processing_fee?: number;
  network_fee?: number;
  request_metadata?: any;
  user_agent?: string;
  ip_address?: string;
}

export interface Deposit {
  id: string;
  user_email: string;
  user_id?: string;
  amount: number;
  currency: string;
  method_id: string;
  method_name: string;
  network: string;
  deposit_address: string;
  user_wallet_address?: string;
  transaction_hash?: string;
  confirmation_count: number;
  required_confirmations: number;
  processing_fee: number;
  network_fee: number;
  final_amount: number;
  status: 'pending' | 'received' | 'confirmed' | 'completed' | 'rejected' | 'expired' | 'failed';
  admin_notes?: string;
  admin_email?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  request_metadata?: any;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export class DepositService {
  private static instance: DepositService;
  private supabase;

  private constructor() {
    // Use service role key for server-side operations to bypass RLS
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  public static getInstance(): DepositService {
    if (!DepositService.instance) {
      DepositService.instance = new DepositService();
    }
    return DepositService.instance;
  }

  /**
   * Create a new deposit record
   */
  async createDeposit(depositData: DepositData): Promise<Deposit> {
    const finalAmount = depositData.amount - (depositData.processing_fee || 0) - (depositData.network_fee || 0);
    
    const depositRecord = {
      user_email: depositData.user_email,
      user_id: depositData.user_id,
      amount: depositData.amount,
      currency: depositData.currency || 'USD',
      method_id: depositData.method_id,
      method_name: depositData.method_name,
      network: depositData.network,
      deposit_address: depositData.deposit_address,
      processing_fee: depositData.processing_fee || 0,
      network_fee: depositData.network_fee || 0,
      final_amount: finalAmount,
      status: 'pending' as const,
      request_metadata: depositData.request_metadata,
      user_agent: depositData.user_agent,
      ip_address: depositData.ip_address,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    };

    const { data, error } = await this.supabase
      .from('deposits')
      .insert([depositRecord])
      .select()
      .single();

    if (error) {
      console.error('Error creating deposit:', error);
      throw new Error(`Failed to create deposit: ${error.message}`);
    }

    console.log('✅ Deposit created successfully:', data.id);
    return data as Deposit;
  }

  /**
   * Get deposit by ID
   */
  async getDepositById(depositId: string): Promise<Deposit | null> {
    const { data, error } = await this.supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching deposit:', error);
      throw new Error(`Failed to fetch deposit: ${error.message}`);
    }

    return data as Deposit;
  }

  /**
   * Get deposits for a user
   */
  async getUserDeposits(
    userEmail: string, 
    options: { 
      limit?: number; 
      offset?: number; 
      status?: string 
    } = {}
  ): Promise<{ deposits: Deposit[]; total: number }> {
    const { limit = 20, offset = 0, status } = options;

    let query = this.supabase
      .from('deposits')
      .select('*', { count: 'exact' })
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching user deposits:', error);
      throw new Error(`Failed to fetch deposits: ${error.message}`);
    }

    return {
      deposits: data as Deposit[],
      total: count || 0
    };
  }

  /**
   * Update deposit status (admin function)
   * Automatically credits wallet when status is set to 'completed'
   */
  async updateDepositStatus(
    depositId: string,
    status: Deposit['status'],
    adminEmail: string,
    adminNotes?: string
  ): Promise<Deposit> {
    // Get the current deposit details first
    const currentDeposit = await this.getDepositById(depositId);
    if (!currentDeposit) {
      throw new Error('Deposit not found');
    }

    const updateData: any = {
      status,
      admin_email: adminEmail,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    };

    // Set approval/rejection timestamps
    if (status === 'completed') {
      updateData.approved_by = adminEmail;
      updateData.approved_at = new Date().toISOString();
    } else if (status === 'rejected') {
      updateData.rejected_by = adminEmail;
      updateData.rejected_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('deposits')
      .update(updateData)
      .eq('id', depositId)
      .select()
      .single();

    if (error) {
      console.error('Error updating deposit status:', error);
      throw new Error(`Failed to update deposit: ${error.message}`);
    }

    const updatedDeposit = data as Deposit;

    // If status is completed and it wasn't completed before, credit the user's wallet
    if (status === 'completed' && currentDeposit.status !== 'completed') {
      try {
        console.log(`💰 Crediting wallet for completed deposit: ${depositId}`);

        // Check if this deposit has already been credited to prevent duplicates
        const { data: existingTransaction } = await this.supabase
          .from('wallet_transactions')
          .select('id')
          .eq('transaction_id', depositId)
          .eq('transaction_type', 'deposit')
          .single();

        if (existingTransaction) {
          console.log(`⚠️ Deposit ${depositId} already credited to wallet, skipping duplicate credit`);
        } else {
          // Use WalletService to credit the user's wallet
          const walletService = WalletService.getInstance();

          // Use final_amount if available, otherwise use original amount
          const creditAmount = updatedDeposit.final_amount || updatedDeposit.amount;

          if (!creditAmount || creditAmount <= 0) {
            throw new Error(`Invalid credit amount: ${creditAmount}`);
          }

          // Credit the amount to the user's wallet
          await walletService.updateBalance(
            creditAmount,
            'deposit',
            depositId
          );

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
          .eq('id', depositId);

        throw new Error(`Failed to credit wallet: ${walletError}. Deposit status reverted.`);
      }
    }

    console.log(`✅ Deposit ${depositId} status updated to ${status} by ${adminEmail}`);
    return updatedDeposit;
  }

  /**
   * Get pending deposits for admin
   */
  async getPendingDeposits(limit: number = 50): Promise<Deposit[]> {
    const { data, error } = await this.supabase
      .from('deposits')
      .select('*')
      .in('status', ['pending', 'received', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching pending deposits:', error);
      throw new Error(`Failed to fetch pending deposits: ${error.message}`);
    }

    return data as Deposit[];
  }

  /**
   * Get deposit statistics
   */
  async getDepositStats(userEmail?: string): Promise<{
    total_deposits: number;
    total_amount: number;
    pending_deposits: number;
    completed_deposits: number;
    success_rate: string;
  }> {
    let query = this.supabase.from('deposits').select('amount, status');
    
    if (userEmail) {
      query = query.eq('user_email', userEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching deposit stats:', error);
      throw new Error(`Failed to fetch deposit statistics: ${error.message}`);
    }

    const totalDeposits = data.length;
    const totalAmount = data.reduce((sum, deposit) => sum + deposit.amount, 0);
    const pendingDeposits = data.filter(d => d.status === 'pending').length;
    const completedDeposits = data.filter(d => d.status === 'completed').length;
    const successRate = totalDeposits > 0 ? ((completedDeposits / totalDeposits) * 100).toFixed(1) : '0';

    return {
      total_deposits: totalDeposits,
      total_amount: totalAmount,
      pending_deposits: pendingDeposits,
      completed_deposits: completedDeposits,
      success_rate: successRate
    };
  }

  /**
   * Mark expired deposits
   */
  async markExpiredDeposits(): Promise<number> {
    const { data, error } = await this.supabase
      .from('deposits')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error marking expired deposits:', error);
      throw new Error(`Failed to mark expired deposits: ${error.message}`);
    }

    const expiredCount = data.length;
    if (expiredCount > 0) {
      console.log(`✅ Marked ${expiredCount} deposits as expired`);
    }

    return expiredCount;
  }
}
