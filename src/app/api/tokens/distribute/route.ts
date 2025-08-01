import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Token allocation per plan (yearly amounts)
const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
  'starter': 500    // Starter Plan: 500 TIC tokens per year
};

// Calculate daily token amount (yearly amount / 365 days)
const getDailyTokenAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return Math.round((yearlyAmount / 365) * 1000) / 1000; // Round to nearest 3 decimal places
};

// POST - Distribute daily tokens to all active subscribers
export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json();

    // Simple admin verification (in production, use proper authentication)
    if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'admin123')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get all active subscriptions
    const { data: activeSubscriptions, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    if (subsError) {
      console.error('Error fetching active subscriptions:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch active subscriptions' },
        { status: 500 }
      );
    }

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        distributed: 0
      });
    }

    const distributionResults = [];

    for (const subscription of activeSubscriptions) {
      const dailyTokens = getDailyTokenAmount(subscription.plan_id);
      
      if (dailyTokens <= 0) {
        console.log(`No token allocation for plan: ${subscription.plan_id}`);
        continue;
      }

      // Check if tokens were already distributed today for this subscription
      const { data: existingDistribution } = await supabaseAdmin
        .from('token_distributions')
        .select('id')
        .eq('user_email', subscription.user_email)
        .eq('subscription_id', subscription.id)
        .eq('distribution_date', today)
        .single();

      if (existingDistribution) {
        console.log(`Tokens already distributed today for ${subscription.user_email}`);
        continue;
      }

      // Create token distribution record
      const { data: distribution, error: distError } = await supabaseAdmin
        .from('token_distributions')
        .insert({
          user_email: subscription.user_email,
          subscription_id: subscription.id,
          plan_id: subscription.plan_id,
          plan_name: subscription.plan_name,
          token_amount: dailyTokens,
          distribution_date: today,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (distError) {
        console.error(`Error creating distribution record for ${subscription.user_email}:`, distError);
        continue;
      }

      // Update user's TIC token balance using RPC function with transaction history
      const transactionId = `daily_tic_${subscription.plan_id}_${today}_${subscription.id}`;
      const description = `Daily TIC Distribution - ${subscription.plan_id.toUpperCase()} Plan (${dailyTokens} TIC)`;

      const { error: walletError } = await supabaseAdmin
        .rpc('increment_tic_balance_daily_distribution', {
          user_email_param: subscription.user_email,
          amount_param: dailyTokens,
          transaction_id_param: transactionId,
          description_param: description,
          plan_type_param: subscription.plan_id
        });

      if (walletError) {
        console.error(`Error updating wallet for ${subscription.user_email}:`, walletError);
        // Mark distribution as failed
        await supabaseAdmin
          .from('token_distributions')
          .update({ status: 'failed' })
          .eq('id', distribution.id);
        continue;
      }

      distributionResults.push({
        user_email: subscription.user_email,
        plan_name: subscription.plan_name,
        tokens_distributed: dailyTokens,
        status: 'success'
      });

      // Verify TIC balance is accurate after distribution
      try {
        const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000'}/api/wallet/sync-tic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: subscription.user_email })
        });

        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          if (syncData.syncNeeded) {
            console.log(`✅ TIC balance synced for ${subscription.user_email}: ${syncData.difference} TIC difference corrected`);
          }
        }
      } catch (syncError) {
        console.error(`Warning: TIC sync failed for ${subscription.user_email}:`, syncError);
        // Don't fail the distribution if sync fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Daily token distribution completed`,
      date: today,
      total_subscriptions: activeSubscriptions.length,
      distributions_processed: distributionResults.length,
      results: distributionResults
    });

  } catch (error) {
    console.error('Error in token distribution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get token distribution history
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

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId'); // Optional plan filter
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Use authenticated user's email instead of accepting it from query params
    const userEmail = session.user.email;

    // Build query with optional plan filter
    let query = supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('user_email', userEmail);

    // Add plan filter if specified
    if (planId) {
      query = query.eq('plan_id', planId);
    }

    // Get user's token distribution history
    const { data: distributions, error } = await query
      .order('distribution_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching token distributions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch token distributions' },
        { status: 500 }
      );
    }

    // Calculate total tokens distributed
    const totalTokens = distributions?.reduce((sum, dist) => sum + dist.token_amount, 0) || 0;

    return NextResponse.json({
      success: true,
      distributions: distributions || [],
      total_tokens_distributed: totalTokens,
      pagination: {
        limit,
        offset,
        hasMore: distributions?.length === limit
      }
    });

  } catch (error) {
    console.error('Error in token distribution GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
