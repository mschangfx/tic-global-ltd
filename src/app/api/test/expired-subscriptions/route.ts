import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Test endpoint to simulate expired subscriptions and test the cleanup system
export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    const userEmail = session.user.email;

    if (action === 'create_expired') {
      // Create a test subscription that's already expired
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30); // 30 days ago
      
      const expiredEndDate = new Date();
      expiredEndDate.setDate(expiredEndDate.getDate() - 1); // Yesterday

      const { data: testSubscription, error: createError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_email: userEmail,
          plan_id: 'starter',
          plan_name: 'Test Expired Starter Plan',
          status: 'active', // Still marked as active but end_date is in the past
          start_date: pastDate.toISOString(),
          end_date: expiredEndDate.toISOString(),
          created_at: pastDate.toISOString()
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create test expired subscription', details: createError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Created test expired subscription',
        subscription: testSubscription
      });
    }

    if (action === 'cleanup_expired') {
      // Manually trigger the expired subscription cleanup
      const now = new Date().toISOString();
      
      // Find expired subscriptions
      const { data: expiredSubs, error: findError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('*')
        .eq('user_email', userEmail)
        .eq('status', 'active')
        .lt('end_date', now);

      if (findError) {
        return NextResponse.json(
          { error: 'Failed to find expired subscriptions', details: findError.message },
          { status: 500 }
        );
      }

      if (!expiredSubs || expiredSubs.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No expired subscriptions found',
          expired_count: 0
        });
      }

      // Mark them as expired
      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ 
          status: 'expired',
          updated_at: now
        })
        .eq('user_email', userEmail)
        .eq('status', 'active')
        .lt('end_date', now);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update expired subscriptions', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Marked ${expiredSubs.length} subscriptions as expired`,
        expired_subscriptions: expiredSubs,
        expired_count: expiredSubs.length
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "create_expired" or "cleanup_expired"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in expired subscription test:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Check expired subscription status for current user
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const now = new Date().toISOString();

    // Get all subscriptions for this user
    const { data: allSubs, error: allError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (allError) {
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: allError.message },
        { status: 500 }
      );
    }

    // Categorize subscriptions
    const activeSubs = allSubs?.filter(sub => sub.status === 'active' && new Date(sub.end_date) > new Date()) || [];
    const expiredButActive = allSubs?.filter(sub => sub.status === 'active' && new Date(sub.end_date) <= new Date()) || [];
    const markedExpired = allSubs?.filter(sub => sub.status === 'expired') || [];

    return NextResponse.json({
      success: true,
      user_email: userEmail,
      current_time: now,
      summary: {
        total_subscriptions: allSubs?.length || 0,
        truly_active: activeSubs.length,
        expired_but_marked_active: expiredButActive.length,
        marked_as_expired: markedExpired.length,
        needs_cleanup: expiredButActive.length > 0
      },
      subscriptions: {
        active: activeSubs,
        expired_but_active: expiredButActive,
        marked_expired: markedExpired
      },
      recommendations: expiredButActive.length > 0 
        ? ['Run cleanup to mark expired subscriptions', 'Check cron job is working']
        : ['System is working correctly']
    });

  } catch (error) {
    console.error('Error checking expired subscription status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
