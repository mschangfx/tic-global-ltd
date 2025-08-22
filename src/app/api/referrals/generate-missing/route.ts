import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting to generate missing referral codes...');

    // Get all users who don't have referral codes
    const { data: usersWithoutCodes, error: queryError } = await supabaseAdmin
      .from('users')
      .select('email, created_at')
      .not('email', 'in', `(SELECT user_email FROM user_referral_codes)`);

    if (queryError) {
      console.error('Error querying users without codes:', queryError);
      return NextResponse.json(
        { success: false, message: 'Failed to query users' },
        { status: 500 }
      );
    }

    if (!usersWithoutCodes || usersWithoutCodes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All users already have referral codes',
        generated: 0
      });
    }

    console.log(`📊 Found ${usersWithoutCodes.length} users without referral codes`);

    // Generate referral codes for users without them
    const generateReferralCode = (userEmail: string): string => {
      const username = userEmail.split('@')[0].toUpperCase();
      const timestamp = Date.now().toString().slice(-4);
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `${username.substring(0, 3)}${randomSuffix}${timestamp}`;
    };

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://ticgloballtd.com';
    const referralCodesToInsert = [];

    for (const user of usersWithoutCodes) {
      let referralCode = generateReferralCode(user.email);
      let attempts = 0;
      const maxAttempts = 5;

      // Ensure uniqueness
      while (attempts < maxAttempts) {
        const { data: existingCode } = await supabaseAdmin
          .from('user_referral_codes')
          .select('referral_code')
          .eq('referral_code', referralCode)
          .single();

        if (!existingCode) {
          break; // Code is unique
        }

        // Generate new code if collision
        referralCode = generateReferralCode(user.email);
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.warn(`⚠️ Could not generate unique code for ${user.email} after ${maxAttempts} attempts`);
        continue;
      }

      const referralLink = `${baseUrl}/join?ref=${referralCode}`;

      referralCodesToInsert.push({
        user_email: user.email,
        referral_code: referralCode,
        referral_link: referralLink,
        total_referrals: 0,
        total_earnings: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Insert all referral codes
    if (referralCodesToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('user_referral_codes')
        .insert(referralCodesToInsert);

      if (insertError) {
        console.error('Error inserting referral codes:', insertError);
        return NextResponse.json(
          { success: false, message: 'Failed to insert referral codes' },
          { status: 500 }
        );
      }

      console.log(`✅ Successfully generated ${referralCodesToInsert.length} referral codes`);
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${referralCodesToInsert.length} referral codes`,
      generated: referralCodesToInsert.length,
      codes: referralCodesToInsert.map(code => ({
        email: code.user_email,
        referralCode: code.referral_code
      }))
    });

  } catch (error) {
    console.error('Error generating missing referral codes:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
