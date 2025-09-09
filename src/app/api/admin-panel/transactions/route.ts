import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'withdrawals', 'deposits', or null for all
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    let allTransactions: any[] = [];

    // Load withdrawals
    if (!type || type === 'withdrawals') {
      const { data: withdrawals, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (withdrawalError) {
        console.error('Withdrawal query error:', withdrawalError);
      } else {
        const withdrawalTransactions = (withdrawals || []).map(w => ({
          ...w,
          type: 'withdrawal'
        }));
        allTransactions.push(...withdrawalTransactions);
      }
    }

    // Load deposits
    if (!type || type === 'deposits') {
      const { data: deposits, error: depositError } = await supabase
        .from('deposits')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (depositError) {
        console.error('Deposit query error:', depositError);
      } else {
        const depositTransactions = (deposits || []).map(d => ({
          ...d,
          type: 'deposit'
        }));
        allTransactions.push(...depositTransactions);
      }
    }

    // Sort by created_at descending
    allTransactions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Limit results
    if (allTransactions.length > limit) {
      allTransactions = allTransactions.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      count: allTransactions.length,
      admin: authCheck.email
    });

  } catch (error) {
    console.error('Admin transactions GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await isAuthorizedAdmin(request);
    
    if (!authCheck.authorized) {
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, transactionId, transactionType, adminNotes } = body;

    if (!action || !transactionId || !transactionType) {
      return NextResponse.json({
        error: 'Missing required fields: action, transactionId, transactionType'
      }, { status: 400 });
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
    console.error('Admin transactions POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}
