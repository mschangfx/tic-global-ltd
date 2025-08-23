import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { referralCodeGenerator } from '@/lib/services/referralCodeGenerator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Getting referral data for user:', email);

    // Ensure user has referral code (create if missing)
    const referralResult = await referralCodeGenerator.ensureUserHasReferralCode(email);

    if (!referralResult.success) {
      return NextResponse.json(
        { error: referralResult.message },
        { status: 500 }
      );
    }

    // Get detailed referral statistics
    const { data: referralStats, error: statsError } = await supabaseAdmin
      .from('user_referral_codes')
      .select('*')
      .eq('user_email', email)
      .single();

    if (statsError) {
      console.error('❌ Error fetching referral stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch referral statistics' },
        { status: 500 }
      );
    }

    // Get referral relationships (who this user has referred)
    const { data: referredUsers, error: referredError } = await supabaseAdmin
      .from('referral_relationships')
      .select(`
        referred_email,
        created_at,
        level_depth,
        is_active
      `)
      .eq('referrer_email', email)
      .eq('level_depth', 1) // Direct referrals only
      .order('created_at', { ascending: false });

    if (referredError) {
      console.error('❌ Error fetching referred users:', referredError);
    }

    // Get who referred this user
    const { data: referrerData, error: referrerError } = await supabaseAdmin
      .from('referral_relationships')
      .select(`
        referrer_email,
        referral_code,
        created_at
      `)
      .eq('referred_email', email)
      .eq('level_depth', 1)
      .single();

    if (referrerError && referrerError.code !== 'PGRST116') {
      console.error('❌ Error fetching referrer data:', referrerError);
    }

    const response = {
      success: true,
      data: {
        // User's own referral information
        referralCode: referralStats.referral_code,
        referralLink: referralStats.referral_link,
        totalReferrals: referralStats.total_referrals || 0,
        totalEarnings: referralStats.total_earnings || 0,
        
        // Users this person has referred
        referredUsers: referredUsers || [],
        
        // Who referred this user
        referredBy: referrerData ? {
          email: referrerData.referrer_email,
          code: referrerData.referral_code,
          date: referrerData.created_at
        } : null,
        
        // Statistics
        stats: {
          directReferrals: referredUsers?.length || 0,
          activeReferrals: referredUsers?.filter(r => r.is_active).length || 0,
          createdAt: referralStats.created_at,
          updatedAt: referralStats.updated_at
        }
      }
    };

    console.log('✅ Referral data retrieved successfully for:', email);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in referral data API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, action } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (action === 'regenerate') {
      console.log('🔄 Regenerating referral code for:', email);
      
      // Delete existing referral code
      await supabaseAdmin
        .from('user_referral_codes')
        .delete()
        .eq('user_email', email);

      // Clear referral code from users table
      await supabaseAdmin
        .from('users')
        .update({ referral_code: null })
        .eq('email', email);

      // Create new referral setup
      const referralResult = await referralCodeGenerator.createUserReferralSetup(email);

      if (!referralResult.success) {
        return NextResponse.json(
          { error: referralResult.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Referral code regenerated successfully',
        data: {
          referralCode: referralResult.code,
          referralLink: referralResult.link
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Error in referral data POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
