import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Allowed admin accounts
const ALLOWED_ADMIN_ACCOUNTS = [
  'admin@ticgloballtd.com',
  'support@ticgloballtd.com',
  'mschangfx@gmail.com',
  'client@ticgloballtd.com',
  'manager@ticgloballtd.com'
];

// Check if user is authorized admin
async function isAuthorizedAdmin(request: NextRequest): Promise<{ authorized: boolean; email?: string }> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { authorized: false };
    }

    const userEmail = session.user.email;
    const isAllowed = ALLOWED_ADMIN_ACCOUNTS.includes(userEmail);

    return { 
      authorized: isAllowed, 
      email: userEmail 
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return { authorized: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = await isAuthorizedAdmin(request);
    
    if (!authCheck.authorized) {
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    // Get pending withdrawals count
    const { data: pendingWithdrawals, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    if (withdrawalError) {
      console.error('Withdrawal count error:', withdrawalError);
    }

    // Get pending deposits count
    const { data: pendingDeposits, error: depositError } = await supabase
      .from('deposits')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    if (depositError) {
      console.error('Deposit count error:', depositError);
    }

    // Get total users count
    const { data: totalUsers, error: userError } = await supabase
      .from('users')
      .select('id', { count: 'exact' });

    if (userError) {
      console.error('User count error:', userError);
    }

    // Get total transactions count (both withdrawals and deposits)
    const { data: totalWithdrawals, error: totalWithdrawalError } = await supabase
      .from('withdrawal_requests')
      .select('id', { count: 'exact' });

    const { data: totalDeposits, error: totalDepositError } = await supabase
      .from('deposits')
      .select('id', { count: 'exact' });

    if (totalWithdrawalError) {
      console.error('Total withdrawal count error:', totalWithdrawalError);
    }

    if (totalDepositError) {
      console.error('Total deposit count error:', totalDepositError);
    }

    const stats = {
      pendingWithdrawals: pendingWithdrawals?.length || 0,
      pendingDeposits: pendingDeposits?.length || 0,
      totalUsers: totalUsers?.length || 0,
      totalTransactions: (totalWithdrawals?.length || 0) + (totalDeposits?.length || 0),
      lastUpdated: new Date().toISOString(),
      admin: authCheck.email
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
