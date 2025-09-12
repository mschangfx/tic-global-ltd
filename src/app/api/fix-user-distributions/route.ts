import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Fix distributions for a specific user OR all users - handles multiple subscriptions efficiently
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, fixAllUsers = false } = body;

    if (!userEmail && !fixAllUsers) {
      return NextResponse.json(
        { error: 'User email is required, or set fixAllUsers: true' },
        { status: 400 }
      );
    }

    if (fixAllUsers) {
      console.log('🔧 Fixing distributions for ALL USERS...');
      return await fixAllUsersDistributions();
    } else {
      console.log('🔧 Fixing distributions for user:', userEmail);
      return await fixSingleUserDistributions(userEmail, true);
    }

  } catch (error: any) {
    console.error('❌ Error fixing distributions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fix distributions'
      },
      { status: 500 }
    );
  }
}

// Fix distributions for all users with missing distributions
async function fixAllUsersDistributions() {
  try {
    console.log('🌍 Starting comprehensive fix for all users...');

    // Get all users with missing distributions
    const { data: usersWithMissing, error: analysisError } = await supabaseAdmin.rpc('analyze_missing_distributions');

    if (analysisError) {
      console.error('Error analyzing missing distributions:', analysisError);
      // Fallback to manual analysis
      const { data: allUsers, error: userError } = await supabaseAdmin
        .from('user_subscriptions')
        .select('user_email')
        .eq('status', 'active')
        .neq('user_email', null);

      if (userError) {
        throw new Error(`Failed to fetch users: ${userError.message}`);
      }

      const uniqueUsers = Array.from(new Set(allUsers?.map(u => u.user_email) || []));
      console.log(`📊 Found ${uniqueUsers.length} users with active subscriptions`);

      const results = [];
      let totalFixed = 0;

      // Process each user
      for (const email of uniqueUsers) {
        try {
          console.log(`🔄 Processing user: ${email}`);
          const userResult = await fixSingleUserDistributions(email, false);

          if (userResult.success) {
            results.push({
              user_email: email,
              status: 'fixed',
              distributions_created: userResult.total_distributions_created || 0,
              tokens_distributed: userResult.total_tokens_distributed || 0
            });
            totalFixed += userResult.total_distributions_created || 0;
          } else {
            results.push({
              user_email: email,
              status: 'error',
              error: userResult.error
            });
          }

          // Add small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (userError) {
          console.error(`Error processing user ${email}:`, userError);
          results.push({
            user_email: email,
            status: 'error',
            error: userError.message
          });
        }
      }

      // Sync all wallet balances after fixing distributions
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/wallet/sync-all-tic-balances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          console.log('✅ All wallet balances synced successfully');
        }
      } catch (syncError) {
        console.warn('⚠️ Wallet balance sync failed:', syncError);
      }

      return NextResponse.json({
        success: true,
        message: `Comprehensive fix completed for all users`,
        total_users_processed: uniqueUsers.length,
        total_distributions_created: totalFixed,
        results: results.slice(0, 20), // Limit response size
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    console.error('❌ Error in comprehensive fix:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fix all users distributions'
      },
      { status: 500 }
    );
  }
}

// Fix distributions for a single user
async function fixSingleUserDistributions(userEmail: string, returnResponse = true) {
  try {

    // Get all active subscriptions for the user
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      const result = {
        success: false,
        message: 'No active subscriptions found for user'
      };
      return returnResponse ? NextResponse.json(result) : result;
    }

    console.log(`📊 Found ${subscriptions.length} active subscriptions for ${userEmail}`);

    const results = [];
    let totalDistributionsCreated = 0;
    let totalTokensDistributed = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
      console.log(`🔄 Processing subscription ${subscription.id} (${subscription.plan_id})`);

      // Get existing distributions for this subscription
      const { data: existingDists, error: distError } = await supabaseAdmin
        .from('token_distributions')
        .select('distribution_date')
        .eq('user_email', userEmail)
        .eq('subscription_id', subscription.id)
        .eq('status', 'completed');

      if (distError) {
        console.error('Error fetching existing distributions:', distError);
        continue;
      }

      const existingDates = new Set(existingDists?.map(d => d.distribution_date) || []);

      // Calculate date range for distributions
      const subscriptionStart = new Date(subscription.created_at);
      const today = new Date();
      
      // Start from subscription date or August 26, 2025 (whichever is later)
      const distributionStart = new Date(Math.max(
        subscriptionStart.getTime(),
        new Date('2025-08-26').getTime()
      ));

      // Calculate token amount based on plan
      const tokenAmount = subscription.plan_id === 'vip' ? 18.904109589 : 1.369863014;

      const distributionsToCreate = [];
      const currentDate = new Date(distributionStart);

      // Create distributions for each day from start to today
      while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Skip if distribution already exists for this date
        if (!existingDates.has(dateStr)) {
          distributionsToCreate.push({
            user_email: userEmail,
            subscription_id: subscription.id,
            plan_id: subscription.plan_id,
            token_amount: tokenAmount,
            distribution_date: dateStr,
            status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (distributionsToCreate.length > 0) {
        console.log(`📈 Creating ${distributionsToCreate.length} distributions for subscription ${subscription.id}`);

        // Insert distributions in batches to avoid timeout
        const batchSize = 50;
        for (let i = 0; i < distributionsToCreate.length; i += batchSize) {
          const batch = distributionsToCreate.slice(i, i + batchSize);
          
          const { error: insertError } = await supabaseAdmin
            .from('token_distributions')
            .insert(batch);

          if (insertError) {
            console.error('Error inserting distribution batch:', insertError);
            // Continue with next batch instead of failing completely
          } else {
            totalDistributionsCreated += batch.length;
            totalTokensDistributed += batch.reduce((sum, d) => sum + d.token_amount, 0);
          }
        }
      }

      results.push({
        subscription_id: subscription.id,
        plan_id: subscription.plan_id,
        existing_distributions: existingDists?.length || 0,
        new_distributions: distributionsToCreate.length,
        token_amount_per_day: tokenAmount
      });
    }

    // Update wallet balance after creating distributions
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/wallet/sync-all-tic-balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('✅ Wallet balance sync completed');
      }
    } catch (syncError) {
      console.warn('⚠️ Wallet balance sync failed:', syncError);
    }

    const result = {
      success: true,
      message: `Successfully processed distributions for ${userEmail}`,
      user_email: userEmail,
      subscriptions_processed: subscriptions.length,
      total_distributions_created: totalDistributionsCreated,
      total_tokens_distributed: totalTokensDistributed.toFixed(8),
      details: results,
      timestamp: new Date().toISOString()
    };
    return returnResponse ? NextResponse.json(result) : result;

  } catch (error: any) {
    console.error('❌ Error fixing user distributions:', error);
    const result = {
      success: false,
      error: error.message || 'Failed to fix user distributions'
    };
    return returnResponse ? NextResponse.json(result, { status: 500 }) : result;
  }
}

// GET - Check distribution status for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required as query parameter' },
        { status: 400 }
      );
    }

    // Get subscription and distribution summary
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, plan_id, status, created_at')
      .eq('user_email', userEmail)
      .eq('status', 'active');

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    const { data: distributions, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .select('subscription_id, plan_id, token_amount, distribution_date, status')
      .eq('user_email', userEmail)
      .eq('status', 'completed');

    if (distError) {
      throw new Error(`Failed to fetch distributions: ${distError.message}`);
    }

    const totalTokens = distributions?.reduce((sum, d) => sum + parseFloat(d.token_amount.toString()), 0) || 0;

    return NextResponse.json({
      user_email: userEmail,
      active_subscriptions: subscriptions?.length || 0,
      total_distributions: distributions?.length || 0,
      total_tokens: totalTokens.toFixed(8),
      subscriptions: subscriptions || [],
      recent_distributions: distributions?.slice(-10) || []
    });

  } catch (error: any) {
    console.error('❌ Error checking user distributions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to check user distributions' 
      },
      { status: 500 }
    );
  }
}
