import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// GET - Get user's commission earnings history
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    let userEmail = session?.user?.email;

    // If no NextAuth session, try Supabase auth
    if (!userEmail) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email;
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || 'all';

    // Build query
    let query = supabaseAdmin
      .from('commission_earnings')
      .select('*')
      .eq('referrer_email', userEmail)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if specified
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: commissions, error } = await query;

    if (error) {
      console.error('Error fetching commission earnings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch commission earnings' },
        { status: 500 }
      );
    }

    // Get summary statistics
    const { data: summary, error: summaryError } = await supabaseAdmin
      .from('commission_earnings')
      .select('commission_amount, status')
      .eq('referrer_email', userEmail);

    let totalEarned = 0;
    let totalPaid = 0;
    let totalPending = 0;

    if (!summaryError && summary) {
      summary.forEach(item => {
        const amount = parseFloat(item.commission_amount);
        totalEarned += amount;
        
        if (item.status === 'paid') {
          totalPaid += amount;
        } else if (item.status === 'pending') {
          totalPending += amount;
        }
      });
    }

    return NextResponse.json({
      success: true,
      commissions: commissions || [],
      summary: {
        total_earned: totalEarned,
        total_paid: totalPaid,
        total_pending: totalPending,
        total_count: summary?.length || 0
      },
      pagination: {
        limit,
        offset,
        has_more: (commissions?.length || 0) === limit
      }
    });

  } catch (error) {
    console.error('Error in commission earnings API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a new commission earning (for testing or admin use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      referrer_email,
      referred_email,
      commission_type,
      commission_amount,
      commission_rate,
      source_transaction_id,
      source_amount,
      description
    } = body;

    // Validate required fields
    if (!referrer_email || !referred_email || !commission_type || !commission_amount || !commission_rate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use the database function to add commission earning
    const { data, error } = await supabaseAdmin
      .rpc('add_commission_earning', {
        referrer_email_param: referrer_email,
        referred_email_param: referred_email,
        commission_type_param: commission_type,
        commission_amount_param: commission_amount,
        commission_rate_param: commission_rate,
        source_transaction_id_param: source_transaction_id || null,
        source_amount_param: source_amount || null,
        description_param: description || null
      });

    if (error) {
      console.error('Error adding commission earning:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to add commission earning' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Commission earning added successfully',
      data: {
        referrer_email,
        referred_email,
        commission_type,
        commission_amount,
        commission_rate
      }
    });

  } catch (error) {
    console.error('Error in add commission earning API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
