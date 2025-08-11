import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createRegularClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { v4 as uuidv4 } from 'uuid';
import { convertUsdToPhpWithdrawal, validateWithdrawalAmount } from '@/lib/utils/currency';

// Helper function to get authenticated user email from both auth methods
async function getAuthenticatedUserEmail(): Promise<string | null> {
  try {
    // Method 1: Try Supabase auth (manual login) - this works reliably
    try {
      const supabase = createRegularClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser?.email) {
        return supabaseUser.email;
      }
    } catch (supabaseError) {
      console.log('Supabase auth not available:', supabaseError);
    }

    // Method 2: Try NextAuth session (Google OAuth) - fallback
    try {
      const nextAuthSession = await getServerSession(authOptions as any);
      if ((nextAuthSession as any)?.user?.email) {
        return (nextAuthSession as any).user.email;
      }
    } catch (nextAuthError) {
      console.log('NextAuth session not available:', nextAuthError);
    }

    return null;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

// Create service role client for database operations
const createServiceClient = (url: string, serviceKey: string) => {
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function POST(request: NextRequest) {
  try {
    console.log('=== MANUAL WITHDRAWAL API CALLED ===');
    const body = await request.json();
    const { method, accountNumber, amount, currency, network } = body;
    console.log('Request body:', { method, accountNumber, amount, currency, network });

    // Get authenticated user email using hybrid approach
    const userEmail = await getAuthenticatedUserEmail();
    console.log('Authenticated user email:', userEmail);
    if (!userEmail) {
      console.log('❌ User not authenticated');
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!method || !accountNumber || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use service role client for database operations
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    // Validate withdrawal amount using standard validation
    const validation = validateWithdrawalAmount(withdrawalAmount, method);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    // Check user's wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('total_balance')
      .eq('user_email', userEmail)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        { success: false, error: 'Unable to fetch wallet balance' },
        { status: 500 }
      );
    }

    if (wallet.total_balance < withdrawalAmount) {
      return NextResponse.json(
        { success: false, error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Calculate fees
    const fee = withdrawalAmount * 0.10; // 10% processing fee
    const finalAmount = withdrawalAmount - fee;

    // Create withdrawal request
    const withdrawalId = uuidv4();
    const transactionId = uuidv4();

    // Insert withdrawal request
    const { data: withdrawalRequest, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .insert({
        id: withdrawalId,
        user_email: userEmail,
        transaction_id: transactionId,
        method_id: method,
        destination_address: accountNumber, // Fixed: use destination_address instead of account_number
        amount: withdrawalAmount,
        currency: currency || 'USD',
        network: network || method,
        processing_fee: fee,
        final_amount: finalAmount,
        status: 'pending',
        request_metadata: {
          destination_address: accountNumber,
          original_amount: withdrawalAmount,
          fee_percentage: 0.10,
          processing_fee: fee,
          final_amount: finalAmount,
          submitted_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal request:', withdrawalError);
      return NextResponse.json(
        { success: false, error: 'Failed to create withdrawal request' },
        { status: 500 }
      );
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        user_email: userEmail,
        type: 'withdrawal',
        amount: withdrawalAmount,
        currency: currency || 'USD',
        method: method,
        status: 'pending',
        description: `${method} withdrawal to ${accountNumber}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      // Don't return error here, withdrawal request was created successfully
    }

    // Debit the full withdrawal amount immediately from user's wallet
    // Admin will send the final amount (after fees) to the user
    // Company keeps the processing fee
    try {
      const { data: debitResult, error: debitError } = await supabase
        .rpc('debit_user_wallet', {
          user_email_param: userEmail,
          amount_param: withdrawalAmount,
          transaction_id_param: transactionId,
          transaction_type_param: 'withdrawal',
          description_param: `Manual withdrawal request - ${method} to ${accountNumber}`
        });

      if (debitError) {
        console.error('Error debiting wallet:', debitError);
        return NextResponse.json(
          { success: false, error: 'Insufficient balance or wallet error' },
          { status: 400 }
        );
      }

      console.log('💰 Wallet debited immediately:', withdrawalAmount);
    } catch (walletError) {
      console.error('Error processing wallet debit:', walletError);
      return NextResponse.json(
        { success: false, error: 'Failed to process wallet debit' },
        { status: 500 }
      );
    }

    console.log('✅ Manual withdrawal request created successfully:', withdrawalRequest);

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawalId: withdrawalId,
      transactionId: transactionId,
      amount: withdrawalAmount,
      method: method,
      accountNumber: accountNumber,
      status: 'pending'
    });

  } catch (error) {
    console.error('Error in manual withdrawal API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
