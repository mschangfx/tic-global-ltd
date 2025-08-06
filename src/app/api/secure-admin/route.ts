import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Allowed admin accounts - only these emails can access admin functions
const ALLOWED_ADMIN_ACCOUNTS = [
  'admin@ticgloballtd.com',
  'support@ticgloballtd.com',
  // Add your client's actual email addresses here
  'client@ticgloballtd.com',
  'manager@ticgloballtd.com'
];

// Check if user is authorized admin
async function isAuthorizedAdmin(request: NextRequest): Promise<{ authorized: boolean; email?: string }> {
  try {
    // Get session from NextAuth
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
        error: 'Unauthorized - Admin access required',
        code: 'ADMIN_ACCESS_DENIED'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'withdrawals' or 'deposits'
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`Admin ${authCheck.email} requesting ${type} with status ${status}`);

    if (type === 'withdrawals') {
      const { data: withdrawals, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Withdrawal query error:', error);
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: withdrawals || [],
        count: withdrawals?.length || 0,
        admin: authCheck.email
      });

    } else if (type === 'deposits') {
      const { data: deposits, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Deposit query error:', error);
        throw error;
      }

      return NextResponse.json({
        success: true,
        data: deposits || [],
        count: deposits?.length || 0,
        admin: authCheck.email
      });

    } else {
      return NextResponse.json({
        error: 'Invalid type. Use "withdrawals" or "deposits"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Secure admin GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await isAuthorizedAdmin(request);
    
    if (!authCheck.authorized) {
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required',
        code: 'ADMIN_ACCESS_DENIED'
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, transactionId, transactionType, adminNotes, adminEmail } = body;

    if (!action || !transactionId || !transactionType) {
      return NextResponse.json({
        error: 'Missing required fields: action, transactionId, transactionType'
      }, { status: 400 });
    }

    // Verify the admin email matches the session
    if (adminEmail !== authCheck.email) {
      return NextResponse.json({
        error: 'Admin email mismatch'
      }, { status: 403 });
    }

    const timestamp = new Date().toISOString();
    const processedBy = authCheck.email;

    console.log(`Admin ${processedBy} ${action}ing ${transactionType} ${transactionId}`);

    if (transactionType === 'withdrawal') {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_notes: adminNotes || `${action}d by ${processedBy}`,
          processed_by: processedBy,
          processed_at: timestamp,
          updated_at: timestamp
        })
        .eq('id', transactionId)
        .select();

      if (error) {
        console.error('Withdrawal update error:', error);
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: `Withdrawal ${action}d successfully by ${processedBy}`,
        data: data?.[0] || null
      });

    } else if (transactionType === 'deposit') {
      const { data, error } = await supabase
        .from('deposits')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_notes: adminNotes || `${action}d by ${processedBy}`,
          processed_by: processedBy,
          processed_at: timestamp,
          updated_at: timestamp
        })
        .eq('id', transactionId)
        .select();

      if (error) {
        console.error('Deposit update error:', error);
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: `Deposit ${action}d successfully by ${processedBy}`,
        data: data?.[0] || null
      });

    } else {
      return NextResponse.json({
        error: 'Invalid transaction type. Use "withdrawal" or "deposit"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Secure admin POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get admin statistics
export async function PUT(request: NextRequest) {
  try {
    const authCheck = await isAuthorizedAdmin(request);
    
    if (!authCheck.authorized) {
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    // Get pending counts
    const { data: pendingWithdrawals } = await supabase
      .from('withdrawal_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    const { data: pendingDeposits } = await supabase
      .from('deposits')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    // Get recent activity by this admin
    const { data: recentActivity } = await supabase
      .from('withdrawal_requests')
      .select('id, status, processed_at')
      .eq('processed_by', authCheck.email)
      .order('processed_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: {
        pendingWithdrawals: pendingWithdrawals?.length || 0,
        pendingDeposits: pendingDeposits?.length || 0,
        recentActivity: recentActivity || [],
        admin: authCheck.email,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Secure admin stats error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
