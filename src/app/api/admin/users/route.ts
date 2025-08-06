import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET - Get all users with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const { searchParams } = new URL(request.url);
    const verification = searchParams.get('verification') || 'all';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build the query for users
    let usersQuery = supabase
      .from('users')
      .select(`
        email,
        full_name,
        phone_number,
        created_at,
        last_login,
        is_verified,
        referral_code
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply verification filter
    if (verification === 'verified') {
      usersQuery = usersQuery.eq('is_verified', true);
    } else if (verification === 'unverified') {
      usersQuery = usersQuery.eq('is_verified', false);
    }

    // Apply search filter
    if (search) {
      usersQuery = usersQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get wallet balances for each user
    const userEmails = users?.map(user => user.email) || [];
    let walletData: any[] = [];
    
    if (userEmails.length > 0) {
      const { data: wallets, error: walletError } = await supabase
        .from('user_wallets')
        .select('user_email, total_balance')
        .in('user_email', userEmails);

      if (!walletError) {
        walletData = wallets || [];
      }
    }

    // Get transaction summaries for each user
    let transactionData: any[] = [];
    
    if (userEmails.length > 0) {
      const { data: transactions, error: transactionError } = await supabase
        .from('wallet_transactions')
        .select('user_email, type, amount, status')
        .in('user_email', userEmails)
        .eq('status', 'completed');

      if (!transactionError) {
        transactionData = transactions || [];
      }
    }

    // Combine user data with wallet and transaction data
    const enrichedUsers = users?.map(user => {
      const userWallet = walletData.find(w => w.user_email === user.email);
      const userTransactions = transactionData.filter(t => t.user_email === user.email);
      
      const totalDeposits = userTransactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const totalWithdrawals = userTransactions
        .filter(t => t.type === 'withdrawal')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      return {
        ...user,
        total_balance: userWallet?.total_balance || 0,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals
      };
    }) || [];

    // Get user statistics
    const { data: allUsers, error: statsError } = await supabase
      .from('users')
      .select('email, created_at, is_verified, last_login');

    let stats = {
      totalUsers: 0,
      verifiedUsers: 0,
      activeToday: 0,
      newToday: 0
    };

    if (!statsError && allUsers) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      stats = {
        totalUsers: allUsers.length,
        verifiedUsers: allUsers.filter(u => u.is_verified).length,
        activeToday: allUsers.filter(u => 
          u.last_login && new Date(u.last_login) >= today
        ).length,
        newToday: allUsers.filter(u => 
          new Date(u.created_at) >= today
        ).length
      };
    }

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: enrichedUsers.length === limit
      }
    });

  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create admin action for user (e.g., verify, suspend)
export async function POST(request: NextRequest) {
  try {
    const { userEmail, action, reason } = await request.json();

    if (!userEmail || !action) {
      return NextResponse.json(
        { error: 'User email and action are required' },
        { status: 400 }
      );
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'verify':
        updateData.is_verified = true;
        break;
      case 'unverify':
        updateData.is_verified = false;
        break;
      case 'suspend':
        updateData.is_suspended = true;
        updateData.suspension_reason = reason;
        break;
      case 'unsuspend':
        updateData.is_suspended = false;
        updateData.suspension_reason = null;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', userEmail);

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error in admin user action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
