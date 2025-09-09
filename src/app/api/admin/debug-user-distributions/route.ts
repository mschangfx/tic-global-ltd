import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET - Debug specific user's distributions to understand UI display issues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'User email is required as query parameter: ?email=user@example.com'
      }, { status: 400 });
    }

    console.log(`🔍 Debugging distributions for user: ${userEmail}`);

    // Get all distributions for this user
    const { data: distributions, error: distError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .eq('user_email', userEmail)
      .order('distribution_date', { ascending: false });

    if (distError) {
      console.error('Error fetching distributions:', distError);
      return NextResponse.json({
        error: 'Failed to fetch distributions',
        details: distError.message
      }, { status: 500 });
    }

    // Get user's subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'active');

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
    }

    // Analyze the distributions
    const analysis = {
      user_email: userEmail,
      total_distributions: distributions?.length || 0,
      active_subscriptions: subscriptions?.length || 0,
      distributions_by_date: {} as any,
      distributions_by_plan: {} as any,
      recent_distributions: (distributions || []).slice(0, 10),
      ui_grouping_simulation: {} as any
    };

    // Group by date (like the UI does)
    for (const dist of distributions || []) {
      const date = dist.distribution_date;
      const planId = dist.plan_id;
      const amount = parseFloat(dist.token_amount.toString());

      // By date grouping (UI simulation)
      if (!analysis.distributions_by_date[date]) {
        analysis.distributions_by_date[date] = {
          date: date,
          distributions: [],
          total_amount: 0,
          count: 0
        };
      }
      analysis.distributions_by_date[date].distributions.push({
        id: dist.id,
        plan_id: planId,
        amount: amount,
        subscription_id: dist.subscription_id
      });
      analysis.distributions_by_date[date].total_amount += amount;
      analysis.distributions_by_date[date].count += 1;

      // By plan grouping
      if (!analysis.distributions_by_plan[planId]) {
        analysis.distributions_by_plan[planId] = {
          plan_id: planId,
          distributions: [],
          total_amount: 0,
          count: 0
        };
      }
      analysis.distributions_by_plan[planId].distributions.push({
        id: dist.id,
        date: date,
        amount: amount,
        subscription_id: dist.subscription_id
      });
      analysis.distributions_by_plan[planId].total_amount += amount;
      analysis.distributions_by_plan[planId].count += 1;
    }

    // Simulate UI grouping (exactly like TokenDistributionCard does)
    const uiGroupedByDate = (distributions || []).reduce((acc: any, dist: any) => {
      const date = dist.distribution_date;
      if (!acc[date]) {
        acc[date] = {
          date: date,
          total_amount: 0,
          status: dist.status,
          count: 0
        };
      }
      acc[date].total_amount += parseFloat(dist.token_amount.toString());
      acc[date].count += 1;
      return acc;
    }, {});

    // Convert to array and sort by date (newest first) - exactly like UI
    const uiGroupedArray = Object.values(uiGroupedByDate).sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    analysis.ui_grouping_simulation = {
      grouped_by_date: uiGroupedByDate,
      sorted_array: uiGroupedArray.slice(0, 5), // UI shows last 5
      what_user_sees: uiGroupedArray.slice(0, 5).map((group: any) => ({
        date: group.date,
        display_amount: `+${group.total_amount.toFixed(2)} TIC`,
        count: group.count,
        status: group.status
      }))
    };

    // Find potential issues
    const issues = [];
    
    // Check for dates with multiple distributions
    for (const [date, data] of Object.entries(analysis.distributions_by_date)) {
      const dateData = data as any;
      if (dateData.count > 1) {
        issues.push({
          type: 'multiple_distributions_per_date',
          date: date,
          count: dateData.count,
          total_amount: dateData.total_amount,
          individual_amounts: dateData.distributions.map((d: any) => d.amount),
          subscription_ids: dateData.distributions.map((d: any) => d.subscription_id)
        });
      }
    }

    // Check for incorrect amounts
    const correctAmounts = { vip: 18.904109589, starter: 1.369863014 };
    for (const dist of distributions || []) {
      const amount = parseFloat(dist.token_amount.toString());
      const planId = dist.plan_id.toLowerCase();
      const correctAmount = correctAmounts[planId as keyof typeof correctAmounts];
      
      if (correctAmount && Math.abs(amount - correctAmount) >= 0.01) {
        issues.push({
          type: 'incorrect_amount',
          distribution_id: dist.id,
          date: dist.distribution_date,
          plan_id: dist.plan_id,
          current_amount: amount,
          expected_amount: correctAmount,
          difference: amount - correctAmount
        });
      }
    }

    return NextResponse.json({
      success: true,
      analysis: analysis,
      issues_found: issues,
      summary: {
        total_distributions: analysis.total_distributions,
        active_subscriptions: analysis.active_subscriptions,
        dates_with_distributions: Object.keys(analysis.distributions_by_date).length,
        issues_count: issues.length,
        what_ui_displays: analysis.ui_grouping_simulation.what_user_sees
      },
      subscriptions: subscriptions || []
    });

  } catch (error) {
    console.error('Error debugging user distributions:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
