import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Comprehensive fix for ALL users with missing TIC distributions
export async function POST(request: NextRequest) {
  try {
    console.log('🌍 Starting comprehensive distribution fix for ALL users...');

    // Get all users with active subscriptions
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
    let totalDistributionsCreated = 0;
    let totalTokensDistributed = 0;
    let usersProcessed = 0;

    // Process each user
    for (const userEmail of uniqueUsers) {
      try {
        console.log(`🔄 Processing user ${usersProcessed + 1}/${uniqueUsers.length}: ${userEmail}`);
        
        const userResult = await fixUserDistributions(userEmail);
        
        if (userResult.success) {
          results.push({
            user_email: userEmail,
            status: 'fixed',
            distributions_created: userResult.total_distributions_created || 0,
            tokens_distributed: parseFloat(userResult.total_tokens_distributed || '0')
          });
          totalDistributionsCreated += userResult.total_distributions_created || 0;
          totalTokensDistributed += parseFloat(userResult.total_tokens_distributed || '0');
        } else {
          results.push({
            user_email: userEmail,
            status: 'error',
            error: userResult.error
          });
        }

        usersProcessed++;

        // Add small delay to prevent overwhelming the database
        if (usersProcessed % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (userError) {
        console.error(`Error processing user ${userEmail}:`, userError);
        results.push({
          user_email: userEmail,
          status: 'error',
          error: userError.message
        });
        usersProcessed++;
      }
    }

    // Sync all wallet balances after fixing distributions
    console.log('🔄 Syncing all wallet balances...');
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

    const successfulUsers = results.filter(r => r.status === 'fixed').length;
    const errorUsers = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `Comprehensive distribution fix completed`,
      summary: {
        total_users_found: uniqueUsers.length,
        users_processed: usersProcessed,
        successful_fixes: successfulUsers,
        errors: errorUsers,
        total_distributions_created: totalDistributionsCreated,
        total_tokens_distributed: totalTokensDistributed.toFixed(8)
      },
      results: results.slice(0, 50), // Limit response size
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in comprehensive distribution fix:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fix distributions for all users' 
      },
      { status: 500 }
    );
  }
}

// Fix distributions for a single user
async function fixUserDistributions(userEmail: string) {
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
      return {
        success: false,
        message: 'No active subscriptions found for user',
        total_distributions_created: 0,
        total_tokens_distributed: '0'
      };
    }

    let totalDistributionsCreated = 0;
    let totalTokensDistributed = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
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
      
      // Start from actual subscription date (not limited to August 26)
      const distributionStart = new Date(subscriptionStart);

      // Calculate token amount and plan name based on plan
      const tokenAmount = subscription.plan_id === 'vip' ? 18.904109589 : 1.369863014;
      const planName = subscription.plan_id === 'vip' ? 'VIP Plan' : 'Starter Plan';

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
            plan_name: planName,
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
    }

    return {
      success: true,
      message: `Successfully processed distributions for ${userEmail}`,
      user_email: userEmail,
      subscriptions_processed: subscriptions.length,
      total_distributions_created: totalDistributionsCreated,
      total_tokens_distributed: totalTokensDistributed.toFixed(8)
    };

  } catch (error: any) {
    console.error('❌ Error fixing user distributions:', error);
    return {
      success: false,
      error: error.message || 'Failed to fix user distributions',
      total_distributions_created: 0,
      total_tokens_distributed: '0'
    };
  }
}

// GET - Check status of distribution fix
export async function GET(request: NextRequest) {
  try {
    // Get summary of all users and their distribution status
    const { data: summary, error } = await supabaseAdmin.rpc('get_distribution_summary');
    
    if (error) {
      throw new Error(`Failed to get distribution summary: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      summary: summary || [],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error getting distribution status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get distribution status' 
      },
      { status: 500 }
    );
  }
}
