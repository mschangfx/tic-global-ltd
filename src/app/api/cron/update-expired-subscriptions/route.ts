import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// This endpoint should be called daily to update expired subscriptions
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'cron-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Unauthorized cron request - invalid secret');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Invalid cron secret'
      }, { status: 401 });
    }

    const today = new Date().toISOString();
    console.log(`🚀 Starting expired subscription cleanup for ${today}`);

    // Find all subscriptions that have expired (end_date < now) but still have status 'active'
    const { data: expiredSubscriptions, error: fetchError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, user_email, plan_id, plan_name, end_date, status')
      .eq('status', 'active')
      .lt('end_date', today);

    if (fetchError) {
      console.error('❌ Error fetching expired subscriptions:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch expired subscriptions',
        details: fetchError.message
      }, { status: 500 });
    }

    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      console.log('✅ No expired subscriptions found');
      return NextResponse.json({
        success: true,
        message: 'No expired subscriptions to update',
        updated_count: 0,
        deleted_count: 0
      });
    }

    console.log(`🔍 Found ${expiredSubscriptions.length} expired subscriptions to process`);

    let updatedCount = 0;
    let deletedCount = 0;
    const results = [];

    // Process each expired subscription
    for (const subscription of expiredSubscriptions) {
      try {
        console.log(`📝 Processing expired subscription: ${subscription.user_email} - ${subscription.plan_name} (expired: ${subscription.end_date})`);

        // Option 1: Mark as expired (keep record for history)
        const { error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error(`❌ Error updating subscription ${subscription.id}:`, updateError);
          results.push({
            subscription_id: subscription.id,
            user_email: subscription.user_email,
            plan_name: subscription.plan_name,
            action: 'update_failed',
            error: updateError.message
          });
          continue;
        }

        updatedCount++;
        console.log(`✅ Marked subscription as expired: ${subscription.user_email} - ${subscription.plan_name}`);

        // Option 2: Delete expired subscription (uncomment if you want to delete instead of mark as expired)
        /*
        const { error: deleteError } = await supabaseAdmin
          .from('user_subscriptions')
          .delete()
          .eq('id', subscription.id);

        if (deleteError) {
          console.error(`❌ Error deleting subscription ${subscription.id}:`, deleteError);
          results.push({
            subscription_id: subscription.id,
            user_email: subscription.user_email,
            plan_name: subscription.plan_name,
            action: 'delete_failed',
            error: deleteError.message
          });
          continue;
        }

        deletedCount++;
        console.log(`🗑️ Deleted expired subscription: ${subscription.user_email} - ${subscription.plan_name}`);
        */

        results.push({
          subscription_id: subscription.id,
          user_email: subscription.user_email,
          plan_name: subscription.plan_name,
          end_date: subscription.end_date,
          action: 'marked_expired',
          success: true
        });

      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription.id}:`, error);
        results.push({
          subscription_id: subscription.id,
          user_email: subscription.user_email,
          plan_name: subscription.plan_name,
          action: 'processing_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary = `🎉 Expired subscription cleanup completed: ${updatedCount} marked as expired, ${deletedCount} deleted`;
    console.log(summary);

    // Log detailed results for debugging
    if (results.length > 0) {
      console.log('📋 Cleanup Results Summary:');
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.user_email} (${result.plan_name}): ${result.action}`);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Expired subscription cleanup completed`,
      date: today,
      total_expired_found: expiredSubscriptions.length,
      updated_count: updatedCount,
      deleted_count: deletedCount,
      results,
      summary
    });

  } catch (error) {
    console.error('❌ Error in expired subscription cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check expired subscription status
export async function GET(request: NextRequest) {
  try {
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

    if (expiredError || markedError) {
      console.error('Error fetching subscription status:', expiredError || markedError);
      return NextResponse.json({
        error: 'Failed to fetch subscription status'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      date: today,
      expired_but_active: expiredActive?.length || 0,
      marked_as_expired: markedExpired?.length || 0,
      needs_cleanup: (expiredActive?.length || 0) > 0,
      expired_subscriptions: expiredActive || [],
      summary: {
        message: (expiredActive?.length || 0) > 0 
          ? `${expiredActive?.length} subscriptions need to be marked as expired`
          : 'All expired subscriptions are properly marked'
      }
    });

  } catch (error) {
    console.error('Error checking expired subscription status:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
