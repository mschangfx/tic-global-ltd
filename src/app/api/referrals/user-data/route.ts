import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Function to generate a unique referral code
function generateReferralCode(email: string): string {
  // Create a unique code based on email and timestamp
  const emailPart = email.split('@')[0].toUpperCase().slice(0, 4);
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestampPart = Date.now().toString().slice(-4);
  
  return `${emailPart}${randomPart}${timestampPart}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already has a referral code
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('referral_code, id')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json(
        { message: 'Database error occurred' },
        { status: 500 }
      );
    }

    let referralCode = existingUser?.referral_code;

    // If user doesn't have a referral code, generate one
    if (!referralCode) {
      referralCode = generateReferralCode(email);
      
      // Update user with new referral code
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          referral_code: referralCode,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (updateError) {
        console.error('Error updating user with referral code:', updateError);
        return NextResponse.json(
          { message: 'Failed to generate referral code' },
          { status: 500 }
        );
      }
    }

    // Generate referral link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:8000';
    const referralLink = `${baseUrl}/join?ref=${referralCode}`;

    // Get referral statistics
    const stats = await getReferralStats(email, referralCode);

    return NextResponse.json({
      referralCode,
      referralLink,
      stats
    });

  } catch (error) {
    console.error('Error in referral user-data API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getReferralStats(userEmail: string, referralCode: string) {
  try {
    // Get total referrals count
    const { count: totalReferrals } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referral_id', referralCode);

    // Get active referrals (users who have made purchases or are verified)
    const { count: activeReferrals } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referral_id', referralCode)
      .eq('email_verified', true);

    // For now, return mock earnings data
    // In a real implementation, you would calculate this from actual transactions
    const totalEarnings = (totalReferrals || 0) * 13.8; // Average earning per referral
    const monthlyEarnings = (activeReferrals || 0) * 5.2; // Monthly average

    return {
      totalReferrals: totalReferrals || 0,
      activeReferrals: activeReferrals || 0,
      totalEarnings: totalEarnings,
      monthlyEarnings: monthlyEarnings
    };

  } catch (error) {
    console.error('Error calculating referral stats:', error);
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: 0,
      monthlyEarnings: 0
    };
  }
}
