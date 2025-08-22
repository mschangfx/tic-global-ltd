import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting daily operations cron job...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tic_distribution: { success: false, message: '', details: null },
      expired_subscriptions: { success: false, message: '', details: null },
      rank_maintenance: { success: false, message: '', details: null }
    };

    // 1. DAILY TIC DISTRIBUTION (00:00 UTC)
    console.log('📊 Step 1: Processing daily TIC distribution...');
    try {
      const { data: distributionData, error: distributionError } = await supabaseAdmin
        .rpc('process_daily_tic_distribution');

      if (distributionError) {
        throw new Error(`TIC distribution failed: ${distributionError.message}`);
      }

      results.tic_distribution = {
        success: true,
        message: 'Daily TIC distribution completed successfully',
        details: distributionData
      };
      console.log('✅ Daily TIC distribution completed');
    } catch (error) {
      console.error('❌ TIC distribution error:', error);
      results.tic_distribution = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error in TIC distribution',
        details: null
      };
    }

    // 2. UPDATE EXPIRED SUBSCRIPTIONS (00:05 UTC - 5 minutes after TIC distribution)
    console.log('📊 Step 2: Processing expired subscriptions...');
    try {
      const { data: expiredData, error: expiredError } = await supabaseAdmin
        .rpc('update_expired_subscriptions');

      if (expiredError) {
        throw new Error(`Expired subscriptions update failed: ${expiredError.message}`);
      }

      results.expired_subscriptions = {
        success: true,
        message: 'Expired subscriptions updated successfully',
        details: expiredData
      };
      console.log('✅ Expired subscriptions updated');
    } catch (error) {
      console.error('❌ Expired subscriptions error:', error);
      results.expired_subscriptions = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error in expired subscriptions',
        details: null
      };
    }

    // 3. DAILY RANK MAINTENANCE (00:10 UTC - 10 minutes after TIC distribution)
    console.log('📊 Step 3: Processing daily rank maintenance...');
    try {
      const { data: maintenanceData, error: maintenanceError } = await supabaseAdmin
        .rpc('process_daily_rank_maintenance');

      if (maintenanceError) {
        throw new Error(`Rank maintenance failed: ${maintenanceError.message}`);
      }

      results.rank_maintenance = {
        success: true,
        message: 'Daily rank maintenance completed successfully',
        details: maintenanceData
      };
      console.log('✅ Daily rank maintenance completed');
    } catch (error) {
      console.error('❌ Rank maintenance error:', error);
      results.rank_maintenance = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error in rank maintenance',
        details: null
      };
    }

    // Calculate overall success
    const overallSuccess = results.tic_distribution.success && 
                          results.expired_subscriptions.success && 
                          results.rank_maintenance.success;

    console.log('🎯 Daily operations completed:', {
      overall_success: overallSuccess,
      tic_distribution: results.tic_distribution.success,
      expired_subscriptions: results.expired_subscriptions.success,
      rank_maintenance: results.rank_maintenance.success
    });

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess 
        ? 'All daily operations completed successfully' 
        : 'Some daily operations encountered errors',
      timestamp: results.timestamp,
      operations: results,
      summary: {
        total_operations: 3,
        successful_operations: [
          results.tic_distribution.success,
          results.expired_subscriptions.success,
          results.rank_maintenance.success
        ].filter(Boolean).length,
        failed_operations: [
          results.tic_distribution.success,
          results.expired_subscriptions.success,
          results.rank_maintenance.success
        ].filter(success => !success).length
      }
    });

  } catch (error) {
    console.error('❌ Daily operations cron job failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Daily operations cron job failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
