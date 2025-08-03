import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'User email is required'
      }, { status: 400 });
    }

    const supabase = createClient();

    // First, ensure the user has a referral code
    const referralCode = `TIC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const referralLink = `https://ticgloballtd.com/join?ref=${referralCode}`;

    const { data: userReferralCode, error: codeError } = await supabase
      .from('user_referral_codes')
      .upsert({
        user_email: userEmail,
        referral_code: referralCode,
        referral_link: referralLink,
        total_referrals: 0,
        total_earnings: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_email'
      })
      .select()
      .single();

    if (codeError) {
      console.error('Error creating user referral code:', codeError);
    }

    // Create test referral relationships - enough to demonstrate rank progression
    const testReferrals = [
      {
        referred_email: 'alice@example.com',
        level_depth: 1,
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days ago
      },
      {
        referred_email: 'bob@example.com',
        level_depth: 1,
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() // 12 days ago
      },
      {
        referred_email: 'charlie@example.com',
        level_depth: 1,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
      },
      {
        referred_email: 'diana@example.com',
        level_depth: 1,
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() // 8 days ago
      },
      {
        referred_email: 'eve@example.com',
        level_depth: 1,
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() // 6 days ago
      },
      {
        referred_email: 'frank@example.com',
        level_depth: 1,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() // 4 days ago
      },
      {
        referred_email: 'grace@example.com',
        level_depth: 2,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      },
      {
        referred_email: 'henry@example.com',
        level_depth: 2,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      {
        referred_email: 'iris@example.com',
        level_depth: 1,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        referred_email: 'jack@example.com',
        level_depth: 1,
        created_at: new Date().toISOString() // today
      },
      {
        referred_email: 'kate@example.com',
        level_depth: 1,
        created_at: new Date().toISOString() // today - 11th referral for Bronze rank
      }
    ];

    const createdRelationships = [];
    const createdCommissions = [];

    for (const referral of testReferrals) {
      // Create referral relationship
      const { data: relationship, error: relError } = await supabase
        .from('referral_relationships')
        .insert({
          referrer_email: userEmail,
          referred_email: referral.referred_email,
          referral_code: referralCode,
          level_depth: referral.level_depth,
          created_at: referral.created_at,
          is_active: true
        })
        .select()
        .single();

      if (relError) {
        console.error('Error creating relationship:', relError);
        continue;
      }

      createdRelationships.push(relationship);

      // Create commission for this referral (simulate VIP plan purchase)
      const commissionRate = referral.level_depth === 1 ? 10.0 : 5.0;
      const commissionAmount = referral.level_depth === 1 ? 0.044 : 0.022;

      const { data: commission, error: commError } = await supabase
        .from('referral_commissions')
        .insert({
          earner_email: userEmail,
          referral_email: referral.referred_email,
          commission_level: referral.level_depth,
          commission_rate: commissionRate,
          base_earnings: 0.44,
          commission_amount: commissionAmount,
          plan_type: 'vip',
          calculation_date: referral.created_at.split('T')[0],
          created_at: referral.created_at
        })
        .select()
        .single();

      if (commError) {
        console.error('Error creating commission:', commError);
        continue;
      }

      createdCommissions.push(commission);
    }

    // Update user's total referrals and earnings
    const totalEarnings = createdCommissions.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);
    
    const { error: updateError } = await supabase
      .from('user_referral_codes')
      .update({
        total_referrals: createdRelationships.length,
        total_earnings: totalEarnings,
        updated_at: new Date().toISOString()
      })
      .eq('user_email', userEmail);

    if (updateError) {
      console.error('Error updating user totals:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Test referral data created successfully',
      data: {
        userReferralCode: userReferralCode?.referral_code || referralCode,
        relationshipsCreated: createdRelationships.length,
        commissionsCreated: createdCommissions.length,
        totalEarnings: totalEarnings.toFixed(4),
        relationships: createdRelationships,
        commissions: createdCommissions
      }
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE endpoint to clean up test data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'User email is required'
      }, { status: 400 });
    }

    const supabase = createClient();

    const testEmails = [
      'alice@example.com',
      'bob@example.com',
      'charlie@example.com',
      'diana@example.com',
      'eve@example.com',
      'frank@example.com',
      'grace@example.com',
      'henry@example.com',
      'iris@example.com',
      'jack@example.com',
      'kate@example.com'
    ];

    // Delete test relationships
    const { error: relError } = await supabase
      .from('referral_relationships')
      .delete()
      .eq('referrer_email', userEmail)
      .in('referred_email', testEmails);

    // Delete test commissions
    const { error: commError } = await supabase
      .from('referral_commissions')
      .delete()
      .eq('earner_email', userEmail)
      .in('referral_email', testEmails);

    // Reset user totals
    const { error: updateError } = await supabase
      .from('user_referral_codes')
      .update({
        total_referrals: 0,
        total_earnings: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_email', userEmail);

    return NextResponse.json({
      success: true,
      message: 'Test data cleaned up successfully',
      errors: {
        relationships: relError?.message || null,
        commissions: commError?.message || null,
        userUpdate: updateError?.message || null
      }
    });

  } catch (error) {
    console.error('Error cleaning up test data:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
