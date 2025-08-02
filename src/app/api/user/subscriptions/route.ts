import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get user's subscriptions and payment history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // Get user's active subscriptions directly from table
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (subsError) {
      console.error('Error fetching active subscriptions:', subsError);
    }

    // Get user's payment history from payment_transactions table
    let paymentQuery = supabaseAdmin
      .from('payment_transactions')
      .select(`
        id,
        amount,
        currency,
        status,
        plan_name,
        created_at,
        completed_at
      `)
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      paymentQuery = paymentQuery.eq('status', status);
    }

    const { data: payments, error: paymentsError } = await paymentQuery;

    if (paymentsError) {
      console.error('Error fetching payment history:', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      );
    }

    // Get all user subscriptions (including expired)
    const { data: allSubscriptions, error: allSubsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (allSubsError) {
      console.error('Error fetching all subscriptions:', allSubsError);
    }

    // Calculate subscription statistics
    const totalPayments = payments?.length || 0;
    const totalSpent = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const activeCount = activeSubscriptions?.length || 0;
    const expiredCount = allSubscriptions?.filter(sub =>
      sub.status === 'expired' || (sub.end_date && new Date(sub.end_date) < new Date())
    ).length || 0;

    return NextResponse.json({
      success: true,
      active_subscriptions: activeSubscriptions || [],
      all_subscriptions: allSubscriptions || [],
      payment_history: payments || [],
      statistics: {
        total_payments: totalPayments,
        total_spent: totalSpent,
        active_subscriptions: activeCount,
        expired_subscriptions: expiredCount
      },
      pagination: {
        limit,
        offset,
        hasMore: payments?.length === limit
      }
    });

  } catch (error) {
    console.error('Error in user subscriptions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Subscribe to a new plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Use the payments API to process the subscription
    const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000'}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: planId,
        userEmail: session.user.email
      })
    });

    const paymentData = await paymentResponse.json();
    
    if (!paymentData.success) {
      return NextResponse.json(
        { error: paymentData.error || 'Failed to process subscription payment' },
        { status: paymentResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: paymentData.plan,
      transaction: paymentData.transaction,
      wallet: paymentData.wallet
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Cancel or modify subscription
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, action, reason } = body;

    if (!subscriptionId || !action) {
      return NextResponse.json(
        { error: 'Subscription ID and action are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Check if subscription belongs to user
    const { data: subscription, error: fetchError } = await supabase
      .from('user_plan_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_email', user.email)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'cancel':
        updateData.status = 'cancelled';
        updateData.metadata = {
          ...subscription.metadata,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'User requested cancellation'
        };
        break;
      
      case 'suspend':
        updateData.status = 'suspended';
        updateData.metadata = {
          ...subscription.metadata,
          suspended_at: new Date().toISOString(),
          suspension_reason: reason || 'User requested suspension'
        };
        break;
      
      case 'reactivate':
        if (subscription.status === 'suspended') {
          updateData.status = 'active';
          updateData.metadata = {
            ...subscription.metadata,
            reactivated_at: new Date().toISOString()
          };
        } else {
          return NextResponse.json(
            { error: 'Can only reactivate suspended subscriptions' },
            { status: 400 }
          );
        }
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: cancel, suspend, or reactivate' },
          { status: 400 }
        );
    }

    const { data, error } = await supabase
      .from('user_plan_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .eq('user_email', user.email)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Subscription ${action}ed successfully`,
      subscription: data
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete subscription (admin only or expired subscriptions)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');
    const adminKey = searchParams.get('adminKey');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Check if subscription belongs to user
    const { data: subscription, error: fetchError } = await supabase
      .from('user_plan_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_email', user.email)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of expired or cancelled subscriptions (unless admin)
    const isAdmin = adminKey === process.env.ADMIN_API_KEY;
    const canDelete = isAdmin || 
      subscription.status === 'expired' || 
      subscription.status === 'cancelled' ||
      (subscription.expires_at && new Date(subscription.expires_at) < new Date());

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Can only delete expired or cancelled subscriptions' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_plan_subscriptions')
      .delete()
      .eq('id', subscriptionId)
      .eq('user_email', user.email);

    if (error) {
      console.error('Error deleting subscription:', error);
      return NextResponse.json(
        { error: 'Failed to delete subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
