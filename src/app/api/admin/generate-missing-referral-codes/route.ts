import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { referralCodeGenerator } from '@/lib/services/referralCodeGenerator';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting referral code generation for existing users...');

    // Get all users who don't have referral codes
    const { data: usersWithoutCodes, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('email, referral_code')
      .or('referral_code.is.null,referral_code.eq.');

    if (fetchError) {
      console.error('❌ Error fetching users without referral codes:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!usersWithoutCodes || usersWithoutCodes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All users already have referral codes',
        processed: 0,
        created: 0,
        errors: 0
      });
    }

    console.log(`📊 Found ${usersWithoutCodes.length} users without referral codes`);

    let created = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process users in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < usersWithoutCodes.length; i += batchSize) {
      const batch = usersWithoutCodes.slice(i, i + batchSize);
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(usersWithoutCodes.length / batchSize)}`);

      // Process batch concurrently
      const batchPromises = batch.map(async (user) => {
        try {
          console.log(`🎯 Creating referral code for: ${user.email}`);
          
          const result = await referralCodeGenerator.createUserReferralSetup(user.email);
          
          if (result.success) {
            console.log(`✅ Created referral code for ${user.email}: ${result.code}`);
            return { success: true, email: user.email, code: result.code };
          } else {
            console.error(`❌ Failed to create referral code for ${user.email}: ${result.message}`);
            return { success: false, email: user.email, error: result.message };
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Error processing ${user.email}:`, errorMsg);
          return { success: false, email: user.email, error: errorMsg };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Count results
      batchResults.forEach(result => {
        if (result.success) {
          created++;
        } else {
          errors++;
          errorDetails.push(`${result.email}: ${result.error}`);
        }
      });

      // Small delay between batches to be gentle on the database
      if (i + batchSize < usersWithoutCodes.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const response = {
      success: true,
      message: `Referral code generation completed`,
      processed: usersWithoutCodes.length,
      created,
      errors,
      errorDetails: errors > 0 ? errorDetails.slice(0, 10) : [] // Limit error details
    };

    console.log('✅ Referral code generation completed:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in referral code generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get statistics about referral code coverage
    const { data: totalUsers, error: totalError } = await supabaseAdmin
      .from('users')
      .select('email', { count: 'exact' });

    const { data: usersWithCodes, error: codesError } = await supabaseAdmin
      .from('users')
      .select('email', { count: 'exact' })
      .not('referral_code', 'is', null);

    const { data: usersWithoutCodes, error: withoutError } = await supabaseAdmin
      .from('users')
      .select('email', { count: 'exact' })
      .or('referral_code.is.null,referral_code.eq.');

    if (totalError || codesError || withoutError) {
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    const stats = {
      totalUsers: totalUsers?.length || 0,
      usersWithCodes: usersWithCodes?.length || 0,
      usersWithoutCodes: usersWithoutCodes?.length || 0,
      coveragePercentage: totalUsers?.length ? 
        Math.round(((usersWithCodes?.length || 0) / totalUsers.length) * 100) : 0
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching referral code statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
