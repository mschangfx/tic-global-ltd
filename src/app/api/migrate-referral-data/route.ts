import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { action, dryRun = true } = await request.json();

    if (action !== 'migrate-existing-users') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const migrationResults = {
      timestamp: new Date().toISOString(),
      dryRun,
      usersProcessed: 0,
      usersUpdated: 0,
      referralCodesGenerated: 0,
      referralRelationshipsFixed: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    console.log(`🚀 Starting referral data migration (dry run: ${dryRun})`);

    // Step 1: Get all users who don't have referral codes but should
    const { data: usersWithoutCodes, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, referral_code, referral_id, created_at')
      .is('referral_code', null);

    if (usersError) {
      migrationResults.errors.push(`Error fetching users: ${usersError.message}`);
      return NextResponse.json(migrationResults, { status: 500 });
    }

    console.log(`📊 Found ${usersWithoutCodes?.length || 0} users without referral codes`);

    // Step 2: Generate referral codes for users who don't have them
    for (const user of usersWithoutCodes || []) {
      try {
        migrationResults.usersProcessed++;

        // Generate unique referral code
        const generateReferralCode = (userEmail: string): string => {
          const username = userEmail.split('@')[0].toUpperCase();
          const timestamp = Date.now().toString().slice(-4);
          const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
          return `${username.substring(0, 3)}${randomSuffix}${timestamp}`;
        };

        const referralCode = generateReferralCode(user.email);
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ticgloballtd.com';
        const referralLink = `${baseUrl}/join?ref=${referralCode}`;

        const userDetail = {
          email: user.email,
          oldReferralCode: user.referral_code,
          newReferralCode: referralCode,
          actions: [] as string[]
        };

        if (!dryRun) {
          // Update users table
          const { error: userUpdateError } = await supabaseAdmin
            .from('users')
            .update({
              referral_code: referralCode,
              updated_at: new Date().toISOString()
            })
            .eq('email', user.email);

          if (userUpdateError) {
            migrationResults.errors.push(`Error updating user ${user.email}: ${userUpdateError.message}`);
            userDetail.actions.push(`❌ Failed to update users table: ${userUpdateError.message}`);
          } else {
            userDetail.actions.push('✅ Updated users table with referral_code');
            migrationResults.usersUpdated++;
          }

          // Create/update user_referral_codes entry
          const { error: referralCodeError } = await supabaseAdmin
            .from('user_referral_codes')
            .upsert({
              user_email: user.email,
              referral_code: referralCode,
              referral_link: referralLink,
              total_referrals: 0,
              total_earnings: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_email'
            });

          if (referralCodeError) {
            migrationResults.errors.push(`Error creating referral code for ${user.email}: ${referralCodeError.message}`);
            userDetail.actions.push(`❌ Failed to create user_referral_codes entry: ${referralCodeError.message}`);
          } else {
            userDetail.actions.push('✅ Created user_referral_codes entry');
            migrationResults.referralCodesGenerated++;
          }
        } else {
          userDetail.actions.push('🔍 Would update users table with referral_code');
          userDetail.actions.push('🔍 Would create user_referral_codes entry');
        }

        migrationResults.details.push(userDetail);

      } catch (error) {
        const errorMsg = `Error processing user ${user.email}: ${error instanceof Error ? (error as Error).message : 'Unknown error'}`;
        migrationResults.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Step 3: Fix existing referral relationships that might be broken
    console.log('🔧 Checking for broken referral relationships...');

    const { data: brokenRelationships, error: relationshipsError } = await supabaseAdmin
      .from('referral_relationships')
      .select('*')
      .is('referral_code', null);

    if (relationshipsError) {
      migrationResults.errors.push(`Error fetching relationships: ${relationshipsError.message}`);
    } else if (brokenRelationships && brokenRelationships.length > 0) {
      console.log(`📊 Found ${brokenRelationships.length} relationships without referral codes`);

      for (const relationship of brokenRelationships) {
        try {
          // Get the referrer's referral code
          const { data: referrerData, error: referrerError } = await supabaseAdmin
            .from('users')
            .select('referral_code')
            .eq('email', relationship.referrer_email)
            .single();

          if (referrerError || !referrerData?.referral_code) {
            migrationResults.errors.push(`Could not find referral code for referrer ${relationship.referrer_email}`);
            continue;
          }

          if (!dryRun) {
            // Update the relationship with the referral code
            const { error: updateError } = await supabaseAdmin
              .from('referral_relationships')
              .update({
                referral_code: referrerData.referral_code,
                updated_at: new Date().toISOString()
              })
              .eq('id', relationship.id);

            if (updateError) {
              migrationResults.errors.push(`Error updating relationship ${relationship.id}: ${updateError.message}`);
            } else {
              migrationResults.referralRelationshipsFixed++;
            }
          }

        } catch (error) {
          const errorMsg = `Error fixing relationship ${relationship.id}: ${error instanceof Error ? (error as Error).message : 'Unknown error'}`;
          migrationResults.errors.push(errorMsg);
        }
      }
    }

    // Step 4: Validate the migration results
    if (!dryRun) {
      console.log('✅ Migration completed. Running validation...');

      // Count users with referral codes after migration
      const { count: usersWithCodesAfter } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .not('referral_code', 'is', null);

      // Count referral code entries
      const { count: referralCodeEntries } = await supabaseAdmin
        .from('user_referral_codes')
        .select('*', { count: 'exact', head: true });

      migrationResults.details.push({
        validation: {
          usersWithReferralCodesAfter: usersWithCodesAfter,
          userReferralCodeEntries: referralCodeEntries
        }
      });
    }

    console.log('🎉 Migration process completed');
    console.log(`📊 Results: ${migrationResults.usersProcessed} processed, ${migrationResults.usersUpdated} updated, ${migrationResults.referralCodesGenerated} codes generated`);

    return NextResponse.json(migrationResults);

  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? (error as Error).message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get migration status/statistics
    const stats = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    // Count users with referral codes
    const { count: usersWithCodes } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('referral_code', 'is', null);

    // Count users without referral codes
    const { count: usersWithoutCodes } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('referral_code', null);

    // Count referral code entries
    const { count: referralCodeEntries } = await supabaseAdmin
      .from('user_referral_codes')
      .select('*', { count: 'exact', head: true });

    // Count referral relationships
    const { count: referralRelationships } = await supabaseAdmin
      .from('referral_relationships')
      .select('*', { count: 'exact', head: true });

    // Count relationships without referral codes
    const { count: relationshipsWithoutCodes } = await supabaseAdmin
      .from('referral_relationships')
      .select('*', { count: 'exact', head: true })
      .is('referral_code', null);

    return NextResponse.json({
      ...stats,
      statistics: {
        usersWithReferralCodes: usersWithCodes,
        usersWithoutReferralCodes: usersWithoutCodes,
        userReferralCodeEntries: referralCodeEntries,
        referralRelationships: referralRelationships,
        relationshipsWithoutCodes: relationshipsWithoutCodes,
        needsMigration: (usersWithoutCodes || 0) > 0 || (relationshipsWithoutCodes || 0) > 0
      }
    });

  } catch (error) {
    console.error('Error getting migration status:', error);
    return NextResponse.json(
      { error: 'Failed to get migration status' },
      { status: 500 }
    );
  }
}
