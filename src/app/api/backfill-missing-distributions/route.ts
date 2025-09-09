import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// BACKFILL MISSING DISTRIBUTIONS for the past few days
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 BACKFILL: Creating missing distributions for past days...');
    
    const currentTime = new Date().toISOString();
    
    // Define the date range to backfill (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const results = [];
    
    // Get all active subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', endDate.toISOString().split('T')[0]);

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    console.log(`📋 Found ${subscriptions?.length || 0} active subscriptions`);

    // Token allocations
    const TOKEN_ALLOCATIONS = {
      'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
      'starter': 500    // Starter Plan: 500 TIC tokens per year
    } as const;

    const getDailyTokenAmount = (planId: string): number => {
      const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
      return yearlyAmount / 365; // VIP: 18.904109589, Starter: 1.369863014
    };

    // Loop through each day in the range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      console.log(`📅 Processing date: ${dateStr}`);
      
      if (!subscriptions) continue;

      for (const subscription of subscriptions) {
        // Skip if subscription started after this date
        if (new Date(subscription.start_date) > d) continue;
        
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
          console.warn(`⚠️ Invalid token amount for plan ${subscription.plan_id}`);
          continue;
        }

        // Create the missing distribution
        const transactionId = `daily_distribution_${subscription.user_email}_${dateStr}`;
        const description = `Daily TIC Distribution - ${subscription.plan_name}`;

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

          // Update wallet balance
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

          console.log(`✅ Created distribution: ${subscription.user_email} - ${dateStr} - ${dailyTokens} TIC`);

        } catch (error) {
          console.error(`❌ Failed to create distribution for ${subscription.user_email} on ${dateStr}:`, error);
          results.push({
            user_email: subscription.user_email,
            date: dateStr,
            plan: subscription.plan_id,
            amount: dailyTokens,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    const successCount = results.filter(r => r.status === 'created').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    console.log(`🎉 Backfill completed: ${successCount} created, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Backfill completed: ${successCount} distributions created, ${failCount} failed`,
      date_range: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      summary: {
        total_processed: results.length,
        created: successCount,
        failed: failCount
      },
      results: results,
      timestamp: currentTime
    });

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Backfill failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check what distributions are missing
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking for missing distributions...');
    
    // Check last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
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

    // Check each day for each user
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      for (const subscription of subscriptions) {
        // Skip if subscription started after this date
        if (new Date(subscription.start_date) > d) continue;
        
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
            date: dateStr,
            subscription_start: subscription.start_date
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      missing_distributions: missing.length,
      date_range: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      missing: missing,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Check failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
