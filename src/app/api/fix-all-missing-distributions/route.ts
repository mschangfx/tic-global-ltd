import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// COMPREHENSIVE FIX: Create missing distributions for ALL plans and ALL users
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 COMPREHENSIVE FIX: Creating missing distributions for ALL plans and users...');
    
    const currentTime = new Date().toISOString();
    
    // Define the date range (last 8 days: 9/2 to 9/9)
    const dates = [
      '2025-09-02', '2025-09-03', '2025-09-04', '2025-09-05',
      '2025-09-06', '2025-09-07', '2025-09-08', '2025-09-09'
    ];
    
    const results = [];
    
    // Get all active subscriptions with their plan details
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active');

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    console.log(`📋 Found ${subscriptions?.length || 0} active subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        created_count: 0,
        timestamp: currentTime
      });
    }

    // Get token allocations dynamically from subscription_plans table
    const { data: planAllocations, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('plan_id, yearly_tic_allocation');

    let TOKEN_ALLOCATIONS: Record<string, number> = {};
    
    if (planError || !planAllocations) {
      console.warn(`⚠️ Could not fetch plan allocations, using fallback values`);
      // Fallback values
      TOKEN_ALLOCATIONS = {
        'vip': 6900,
        'starter': 500
      };
    } else {
      // Build dynamic allocations from database
      planAllocations.forEach(plan => {
        TOKEN_ALLOCATIONS[plan.plan_id] = plan.yearly_tic_allocation || 0;
      });
    }

    console.log('📋 Token allocations:', TOKEN_ALLOCATIONS);

    const getDailyTokenAmount = (planId: string): number => {
      const yearlyAmount = TOKEN_ALLOCATIONS[planId] || 0;
      return yearlyAmount / 365; // Convert yearly to daily
    };

    // Process each date
    for (const dateStr of dates) {
      console.log(`📅 Processing date: ${dateStr}`);
      
      for (const subscription of subscriptions) {
        // Skip if subscription started after this date
        if (new Date(subscription.start_date) > new Date(dateStr)) {
          console.log(`⏭️ Skipping ${subscription.user_email} for ${dateStr} - subscription started later`);
          continue;
        }
        
        // Check if distribution already exists for this user and date
        const { data: existingDist, error: checkError } = await supabaseAdmin
          .from('token_distributions')
          .select('id')
          .eq('user_email', subscription.user_email)
          .eq('distribution_date', dateStr)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.warn(`⚠️ Error checking existing distribution: ${checkError.message}`);
          continue;
        }

        if (existingDist) {
          console.log(`⏭️ Distribution already exists for ${subscription.user_email} on ${dateStr}`);
          continue;
        }

        // Calculate daily tokens for this plan
        const dailyTokens = getDailyTokenAmount(subscription.plan_id);
        
        if (dailyTokens <= 0) {
          console.warn(`⚠️ Invalid token amount for plan ${subscription.plan_id}: ${dailyTokens}`);
          continue;
        }

        console.log(`➕ Creating distribution: ${subscription.user_email} - ${dateStr} - ${subscription.plan_id} - ${dailyTokens} TIC`);

        try {
          // Insert distribution record
          const { data: newDist, error: insertError } = await supabaseAdmin
            .from('token_distributions')
            .insert({
              user_email: subscription.user_email,
              subscription_id: subscription.id,
              plan_id: subscription.plan_id,
              plan_name: subscription.plan_name,
              token_amount: dailyTokens,
              distribution_date: dateStr,
              status: 'completed',
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to create distribution: ${insertError.message}`);
          }

          // Update wallet balance using RPC function
          const transactionId = `daily_distribution_${subscription.user_email}_${dateStr}`;
          const description = `Daily TIC Distribution - ${subscription.plan_name}`;

          const { error: walletError } = await supabaseAdmin
            .rpc('increment_tic_balance_daily_distribution', {
              user_email_param: subscription.user_email,
              amount_param: dailyTokens,
              transaction_id_param: transactionId,
              description_param: description,
              plan_type_param: subscription.plan_id
            });

          if (walletError) {
            console.warn(`⚠️ Wallet update failed for ${subscription.user_email}: ${walletError.message}`);
          }

          results.push({
            user_email: subscription.user_email,
            date: dateStr,
            plan: subscription.plan_id,
            amount: dailyTokens,
            status: 'created'
          });

          console.log(`✅ Successfully created: ${subscription.user_email} - ${dateStr} - ${dailyTokens} TIC`);

        } catch (error) {
          console.error(`❌ Failed to create distribution for ${subscription.user_email} on ${dateStr}:`, error);
          results.push({
            user_email: subscription.user_email,
            date: dateStr,
            plan: subscription.plan_id,
            amount: dailyTokens,
            status: 'failed',
            error: error instanceof Error ? (error as Error).message : 'Unknown error'
          });
        }
      }
    }

    const successCount = results.filter(r => r.status === 'created').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    console.log(`🎉 Comprehensive fix completed: ${successCount} created, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Comprehensive fix completed: ${successCount} distributions created, ${failCount} failed`,
      date_range: dates,
      token_allocations: TOKEN_ALLOCATIONS,
      summary: {
        total_processed: results.length,
        created: successCount,
        failed: failCount
      },
      results: results,
      timestamp: currentTime
    });

  } catch (error) {
    console.error('❌ Comprehensive fix failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Comprehensive fix failed',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check missing distributions for all plans
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking missing distributions for ALL plans...');
    
    const dates = [
      '2025-09-02', '2025-09-03', '2025-09-04', '2025-09-05',
      '2025-09-06', '2025-09-07', '2025-09-08', '2025-09-09'
    ];
    
    const missing = [];
    
    // Get all active subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active');

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions) {
      return NextResponse.json({
        success: true,
        missing_distributions: 0,
        missing: [],
        timestamp: new Date().toISOString()
      });
    }

    // Check each date for each user
    for (const dateStr of dates) {
      for (const subscription of subscriptions) {
        // Skip if subscription started after this date
        if (new Date(subscription.start_date) > new Date(dateStr)) continue;
        
        // Check if distribution exists
        const { data: existingDist, error: checkError } = await supabaseAdmin
          .from('token_distributions')
          .select('id')
          .eq('user_email', subscription.user_email)
          .eq('distribution_date', dateStr)
          .single();

        if (checkError && checkError.code === 'PGRST116') {
          // No distribution found - this is missing
          missing.push({
            user_email: subscription.user_email,
            plan: subscription.plan_id,
            plan_name: subscription.plan_name,
            date: dateStr,
            subscription_start: subscription.start_date
          });
        }
      }
    }

    // Group missing by plan for summary
    const missingByPlan = missing.reduce((acc, item) => {
      acc[item.plan] = (acc[item.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      missing_distributions: missing.length,
      missing_by_plan: missingByPlan,
      date_range: dates,
      missing: missing,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Check failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Check failed',
        details: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
