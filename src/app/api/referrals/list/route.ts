import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    const searchTerm = searchParams.get('search') || '';
    const level = searchParams.get('level');
    const planType = searchParams.get('planType');
    const status = searchParams.get('status');

    if (!userEmail) {
      return NextResponse.json(
        { message: 'User email is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get user referrals with detailed information
    let query = supabase
      .from('referral_relationships')
      .select(`
        id,
        referred_email,
        level_depth,
        referral_code,
        created_at,
        user_profiles!referral_relationships_referred_email_fkey (
          email,
          full_name,
          last_active
        ),
        user_plans!referral_relationships_referred_email_fkey (
          plan_type,
          status
        )
      `)
      .eq('referrer_email', userEmail)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const { data: referralsData, error } = await query;

    if (error) {
      console.error('Error fetching referrals:', error);
      return NextResponse.json(
        { message: 'Error fetching referrals', error: error.message },
        { status: 500 }
      );
    }

    // Transform and filter the data
    let referrals = (referralsData || []).map((referral: any) => {
      const profile = referral.user_profiles;
      const plan = referral.user_plans;
      
      // Determine status based on plan status and last activity
      let userStatus = 'pending';
      if (plan?.status === 'active') {
        const lastActive = new Date(profile?.last_active || referral.created_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        userStatus = lastActive >= sevenDaysAgo ? 'active' : 'inactive';
      }

      return {
        id: referral.id,
        email: referral.referred_email,
        name: profile?.full_name || referral.referred_email.split('@')[0],
        level: referral.level_depth,
        joinDate: referral.created_at,
        planType: plan?.plan_type || 'starter',
        status: userStatus,
        totalEarnings: 0, // Will be calculated separately
        monthlyEarnings: 0, // Will be calculated separately
        referralsCount: 0, // Will be calculated separately
        lastActive: profile?.last_active || referral.created_at,
        referrerEmail: userEmail,
        referralCode: referral.referral_code || ''
      };
    });

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      referrals = referrals.filter((referral: any) =>
        referral.name.toLowerCase().includes(term) ||
        referral.email.toLowerCase().includes(term) ||
        referral.referralCode.toLowerCase().includes(term)
      );
    }

    // Apply level filter
    if (level) {
      referrals = referrals.filter((referral: any) => referral.level === parseInt(level));
    }

    // Apply plan type filter
    if (planType) {
      referrals = referrals.filter((referral: any) => referral.planType === planType);
    }

    // Apply status filter
    if (status) {
      referrals = referrals.filter((referral: any) => referral.status === status);
    }

    // Get commission data for each referral
    for (const referral of referrals) {
      const { data: commissions } = await supabase
        .from('referral_commissions')
        .select('amount, created_at')
        .eq('user_email', userEmail)
        .eq('from_user_email', referral.email)
        .eq('status', 'completed');

      if (commissions && commissions.length > 0) {
        referral.totalEarnings = commissions.reduce((sum: number, comm: any) => sum + comm.amount, 0);
        
        // Calculate monthly earnings (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        referral.monthlyEarnings = commissions
          .filter((comm: any) => new Date(comm.created_at) >= thirtyDaysAgo)
          .reduce((sum: number, comm: any) => sum + comm.amount, 0);
      }

      // Get referrals count for this user
      const { count } = await supabase
        .from('referral_relationships')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_email', referral.email)
        .eq('is_active', true);

      referral.referralsCount = count || 0;
    }

    return NextResponse.json({
      referrals,
      total: referrals.length
    });

  } catch (error) {
    console.error('Error in referrals list API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { message: 'User email is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get referral statistics
    const { data: referralsData } = await supabase
      .from('referral_relationships')
      .select(`
        level_depth,
        user_profiles!referral_relationships_referred_email_fkey (
          last_active
        ),
        user_plans!referral_relationships_referred_email_fkey (
          plan_type,
          status
        )
      `)
      .eq('referrer_email', userEmail)
      .eq('is_active', true);

    const referrals = referralsData || [];
    
    // Calculate statistics
    let activeReferrals = 0;
    let pendingReferrals = 0;
    let inactiveReferrals = 0;
    const levelBreakdown: { [key: number]: number } = {};
    const planBreakdown: { [key: string]: number } = {};

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    referrals.forEach((referral: any) => {
      const plan = referral.user_plans;
      const profile = referral.user_profiles;
      
      // Count by status
      if (plan?.status === 'active') {
        const lastActive = new Date(profile?.last_active || new Date());
        if (lastActive >= sevenDaysAgo) {
          activeReferrals++;
        } else {
          inactiveReferrals++;
        }
      } else {
        pendingReferrals++;
      }

      // Count by level
      levelBreakdown[referral.level_depth] = (levelBreakdown[referral.level_depth] || 0) + 1;

      // Count by plan
      const planType = plan?.plan_type || 'starter';
      planBreakdown[planType] = (planBreakdown[planType] || 0) + 1;
    });

    // Get total earnings
    const { data: commissionsData } = await supabase
      .from('referral_commissions')
      .select('amount, created_at')
      .eq('user_email', userEmail)
      .eq('status', 'completed');

    const totalEarnings = commissionsData?.reduce((sum, comm) => sum + comm.amount, 0) || 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthlyEarnings = commissionsData
      ?.filter(comm => new Date(comm.created_at) >= thirtyDaysAgo)
      ?.reduce((sum, comm) => sum + comm.amount, 0) || 0;

    const stats = {
      totalReferrals: referrals.length,
      activeReferrals,
      pendingReferrals,
      inactiveReferrals,
      totalEarnings,
      monthlyEarnings,
      referralsByLevel: Object.entries(levelBreakdown).map(([level, count]) => ({
        level: parseInt(level),
        count
      })),
      referralsByPlan: Object.entries(planBreakdown).map(([planType, count]) => ({
        planType,
        count
      }))
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error in referrals stats API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
