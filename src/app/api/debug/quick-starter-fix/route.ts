import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST - Quick fix for Starter plan distributions (creates test user if needed)
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Quick Starter plan fix starting...');

    const body = await request.json();
    const userEmail = body.userEmail;
    const adminKey = body.adminKey;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required' },
        { status: 400 }
      );
    }

    // Simple admin verification for creating test data
    if (adminKey && adminKey !== (process.env.ADMIN_SECRET_KEY || 'admin123')) {
      return NextResponse.json(
        { error: 'Invalid admin key' },
        { status: 401 }
      );
    }

    console.log(`🎯 Processing user: ${userEmail}`);

    // Check if user has a Starter subscription
    let { data: starterSubscription, error: subsError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('plan_id', 'starter')
      .eq('status', 'active')
      .single();

    if (subsError && subsError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking Starter subscription:', subsError);
      return NextResponse.json(
        { 
          error: 'Failed to check subscription',
          details: subsError.message
        },
        { status: 500 }
      );
    }

    // If no Starter subscription exists, create one (for testing)
    if (!starterSubscription) {
      console.log('📝 Creating test Starter subscription...');
      
      const { data: newSubscription, error: createError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_email: userEmail,
          plan_id: 'starter',
          plan_name: 'Starter Plan',
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating Starter subscription:', createError);
        return NextResponse.json(
          { 
            error: 'Failed to create Starter subscription',
            details: createError.message
          },
          { status: 500 }
        );
      }

      starterSubscription = newSubscription;
      console.log('✅ Created test Starter subscription');
    }

    // Delete existing distributions for this user to start fresh
    console.log('🗑️ Cleaning existing distributions...');
    const { error: deleteError } = await supabaseAdmin
      .from('token_distributions')
      .delete()
      .eq('user_email', userEmail);

    if (deleteError) {
      console.error('Error deleting existing distributions:', deleteError);
      // Continue anyway
    }

    // Token allocation for Starter plan
    const STARTER_DAILY_TOKENS = 500 / 365; // 1.3699 TIC per day

    // Create distributions for the last 5 days
    const distributions = [];
    let successCount = 0;

    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const distributionDate = date.toISOString().split('T')[0];

      // Create a specific time for this distribution
      const distributionTime = new Date(date);
      distributionTime.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

      try {
        const { data: distribution, error: distError } = await supabaseAdmin
          .from('token_distributions')
          .insert({
            user_email: userEmail,
            subscription_id: starterSubscription.id,
            plan_id: 'starter',
            plan_name: 'Starter Plan',
            token_amount: STARTER_DAILY_TOKENS,
            distribution_date: distributionDate,
            status: 'completed',
            created_at: distributionTime.toISOString()
          })
          .select()
          .single();

        if (distError) {
          console.error(`Error creating distribution for ${distributionDate}:`, distError);
          distributions.push({
            date: distributionDate,
            status: 'error',
            error: distError.message
          });
        } else {
          console.log(`✅ Created distribution for ${distributionDate}: ${STARTER_DAILY_TOKENS.toFixed(4)} TIC`);
          distributions.push({
            date: distributionDate,
            amount: STARTER_DAILY_TOKENS,
            status: 'created',
            id: distribution.id
          });
          successCount++;
        }
      } catch (insertError) {
        console.error(`Exception creating distribution for ${distributionDate}:`, insertError);
        distributions.push({
          date: distributionDate,
          status: 'error',
          error: insertError instanceof Error ? insertError.message : 'Unknown error'
        });
      }
    }

    console.log(`🎉 Quick fix completed! Created ${successCount} Starter distributions.`);

    return NextResponse.json({
      success: true,
      message: `Quick fix completed for Starter plan user`,
      user_email: userEmail,
      plan: 'Starter Plan',
      daily_amount: STARTER_DAILY_TOKENS,
      distributions_created: successCount,
      subscription_created: !starterSubscription,
      distributions: distributions
    });

  } catch (error) {
    console.error('❌ Unexpected error in quick Starter fix:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check if user has Starter distributions
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userEmail = url.searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required as query parameter' },
        { status: 400 }
      );
    }

    // Check subscription
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('plan_id', 'starter')
      .eq('status', 'active')
      .single();

    // Check distributions
    const { data: distributions } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('plan_id', 'starter')
      .order('distribution_date', { ascending: false });

    return NextResponse.json({
      success: true,
      user_email: userEmail,
      has_starter_subscription: !!subscription,
      subscription: subscription,
      distributions_count: distributions?.length || 0,
      distributions: distributions || [],
      expected_daily_amount: 500 / 365,
      needs_fix: !subscription || !distributions || distributions.length === 0
    });

  } catch (error) {
    console.error('Error checking Starter status:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
