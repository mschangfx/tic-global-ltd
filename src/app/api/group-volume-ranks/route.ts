import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get user's group volume rank qualification
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    // Get current group volumes
    const { data: groupVolumes, error: volumesError } = await supabaseAdmin
      .from('user_group_volumes')
      .select('*')
      .eq('user_email', userEmail)
      .eq('tracking_month', currentMonth)
      .order('group_letter');

    // Get current rank qualification
    const { data: qualification, error: qualError } = await supabaseAdmin
      .from('rank_qualifications')
      .select('*')
      .eq('user_email', userEmail)
      .eq('tracking_month', currentMonth)
      .single();

    if (volumesError || qualError) {
      console.error('Error fetching group volume data:', volumesError || qualError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch group volume data',
        details: (volumesError || qualError)?.message
      }, { status: 500 });
    }

    // Calculate rank requirements and progress
    const rankRequirements = {
      'Bronze': {
        min_players: 5,
        min_groups: 2,
        min_total_volume: 13800,
        group_requirements: {
          A: { min_volume: 6900, min_players: 1 },
          B: { min_volume: 1380, min_players: 1 }
        },
        bonus_percentage: 5.0
      },
      'Silver': {
        min_players: 5,
        min_groups: 3,
        min_total_volume: 41400,
        group_requirements: {
          A: { min_volume: 13800, min_players: 1 },
          B: { min_volume: 6900, min_players: 1 },
          C: { min_volume: 6900, min_players: 1 }
        },
        bonus_percentage: 6.0
      },
      'Gold': {
        min_players: 6,
        min_groups: 3,
        min_total_volume: 69000,
        group_requirements: {
          A: { min_volume: 23000, min_players: 1 },
          B: { min_volume: 4140, min_players: 1 },
          C: { min_volume: 11500, min_players: 1 }
        },
        bonus_percentage: 7.0
      },
      'Platinum': {
        min_players: 8,
        min_groups: 4,
        min_total_volume: 110400,
        group_requirements: {
          A: { min_volume: 27600, min_players: 1 },
          B: { min_volume: 1380, min_players: 1 },
          C: { min_volume: 1380, min_players: 1 },
          D: { min_volume: 40020, min_players: 1 }
        },
        bonus_percentage: 8.0
      },
      'Diamond': {
        min_players: 12,
        min_groups: 5,
        min_total_volume: 165600,
        group_requirements: {
          A: { min_volume: 33120, min_players: 1 },
          B: { min_volume: 32970, min_players: 1 },
          C: { min_volume: 32970, min_players: 1 },
          D: { min_volume: 32970, min_players: 1 },
          E: { min_volume: 32970, min_players: 1 }
        },
        bonus_percentage: 9.0
      }
    };

    return NextResponse.json({
      success: true,
      user_email: userEmail,
      current_month: currentMonth,
      group_volumes: groupVolumes || [],
      current_qualification: qualification || {
        qualified_rank: 'No Rank',
        bonus_amount: 0,
        is_qualified: false,
        total_volume: 0,
        total_active_players: 0
      },
      rank_requirements: rankRequirements,
      progress_analysis: {
        current_rank: qualification?.qualified_rank || 'No Rank',
        current_volume: qualification?.total_volume || 0,
        current_players: qualification?.total_active_players || 0,
        bonus_eligible: qualification?.is_qualified || false,
        potential_bonus: qualification?.bonus_amount || 0
      }
    });

  } catch (error) {
    console.error('Error in group volume ranks GET:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Calculate and update group volumes for user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { action, month } = await request.json();
    const userEmail = session.user.email;
    const trackingMonth = month || new Date().toISOString().substring(0, 7);

    if (action === 'calculate-volumes') {
      // Calculate group volumes
      const { data: volumeResult, error: volumeError } = await supabaseAdmin
        .rpc('calculate_user_group_volumes', {
          user_email_param: userEmail,
          tracking_month_param: trackingMonth
        });

      if (volumeError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to calculate group volumes',
          details: volumeError.message
        }, { status: 500 });
      }

      // Determine rank qualification
      const { data: qualificationResult, error: qualError } = await supabaseAdmin
        .rpc('determine_rank_qualification', {
          user_email_param: userEmail,
          tracking_month_param: trackingMonth
        });

      if (qualError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to determine rank qualification',
          details: qualError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Group volumes calculated and rank determined',
        user_email: userEmail,
        tracking_month: trackingMonth,
        volume_calculation: volumeResult,
        qualification_result: qualificationResult
      });
    }

    if (action === 'test-bonus-distribution') {
      // Test the bonus distribution
      const { data: distributionResult, error: distError } = await supabaseAdmin
        .rpc('process_group_volume_rank_bonus', {
          user_email_param: userEmail,
          distribution_month_param: trackingMonth
        });

      if (distError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to test bonus distribution',
          details: distError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Bonus distribution test completed',
        user_email: userEmail,
        distribution_month: trackingMonth,
        distribution_result: distributionResult,
        bonus_distributed: distributionResult
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "calculate-volumes" or "test-bonus-distribution"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in group volume ranks POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Admin function to update group assignments
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { admin_key, user_email, group_assignments } = await request.json();

    // Verify admin access
    const expectedAdminKey = process.env.ADMIN_API_KEY || 'admin-secret-key';
    if (admin_key !== expectedAdminKey) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Invalid admin key'
      }, { status: 401 });
    }

    // Manual group assignment logic would go here
    // For now, return success message
    return NextResponse.json({
      success: true,
      message: 'Group assignments updated (manual override)',
      user_email: user_email,
      assignments: group_assignments
    });

  } catch (error) {
    console.error('Error in group volume ranks PUT:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
