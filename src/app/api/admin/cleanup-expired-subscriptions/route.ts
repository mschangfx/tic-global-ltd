import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Admin endpoint to manually trigger expired subscription cleanup
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY || 'admin-secret-key';
    
    if (authHeader !== `Bearer ${adminKey}`) {
      console.log('❌ Unauthorized admin request - invalid key');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Invalid admin key'
      }, { status: 401 });
    }

    const today = new Date().toISOString();
    console.log(`🔐 Admin triggered expired subscription cleanup for ${today}`);

    // Call the cron endpoint with proper authorization
    const cronSecret = process.env.CRON_SECRET || 'cron-secret-key';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ticgloballtd.com';
    
    const response = await fetch(`${baseUrl}/api/cron/update-expired-subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error calling expired subscription cleanup cron:', data);
      return NextResponse.json({
        error: 'Failed to execute cleanup',
        details: data.error || 'Unknown error'
      }, { status: response.status });
    }

    console.log('✅ Admin cleanup completed:', data);

    return NextResponse.json({
      success: true,
      message: 'Expired subscription cleanup executed successfully',
      admin_triggered: true,
      timestamp: today,
      results: data
    });

  } catch (error) {
    console.error('❌ Error in admin cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check expired subscription status (admin view)
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY || 'admin-secret-key';
    
    if (authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({
        error: 'Unauthorized - Invalid admin key'
      }, { status: 401 });
    }

    const today = new Date().toISOString();
    
    // Get expired subscriptions that are still marked as active
    const { data: expiredActive, error: expiredError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, user_email, plan_id, plan_name, end_date, status')
      .eq('status', 'active')
      .lt('end_date', today);

    // Get subscriptions marked as expired
    const { data: markedExpired, error: markedError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, user_email, plan_id, plan_name, end_date, status')
      .eq('status', 'expired');

    // Get all active subscriptions
    const { data: activeSubscriptions, error: activeError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, user_email, plan_id, plan_name, end_date, status')
      .eq('status', 'active')
      .gte('end_date', today);

    if (expiredError || markedError || activeError) {
      console.error('Error fetching subscription status:', expiredError || markedError || activeError);
      return NextResponse.json({
        error: 'Failed to fetch subscription status'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      admin_view: true,
      date: today,
      summary: {
        truly_active: activeSubscriptions?.length || 0,
        expired_but_marked_active: expiredActive?.length || 0,
        properly_marked_expired: markedExpired?.length || 0,
        needs_cleanup: (expiredActive?.length || 0) > 0
      },
      details: {
        active_subscriptions: activeSubscriptions || [],
        expired_but_active: expiredActive || [],
        marked_expired: markedExpired || []
      },
      recommendations: (expiredActive?.length || 0) > 0 
        ? [
            'Run cleanup to mark expired subscriptions',
            'Check if cron job is running properly',
            'Verify subscription expiration logic'
          ]
        : [
            'System is working correctly',
            'All expired subscriptions are properly marked',
            'Cron job appears to be functioning'
          ]
    });

  } catch (error) {
    console.error('Error in admin expired subscription check:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
