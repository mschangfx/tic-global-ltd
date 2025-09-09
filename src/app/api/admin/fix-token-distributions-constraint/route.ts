import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST - Add unique constraint to token_distributions table and clean up duplicates
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting token_distributions constraint fix...');

    // Step 1: Check current duplicates
    const { data: duplicates, error: dupError } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, subscription_id, distribution_date, count(*)')
      .group('user_email, subscription_id, distribution_date')
      .having('count(*) > 1');

    if (dupError) {
      console.error('Error checking duplicates:', dupError);
    } else {
      console.log(`📊 Found ${duplicates?.length || 0} duplicate groups`);
    }

    // Step 2: Clean up duplicates by keeping only the latest record for each group
    const cleanupSQL = `
      -- Delete duplicate token_distributions, keeping only the latest one per subscription per day
      DELETE FROM token_distributions 
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_email, subscription_id, distribution_date) id
        FROM token_distributions
        ORDER BY user_email, subscription_id, distribution_date, created_at DESC
      );
    `;

    const { error: cleanupError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: cleanupSQL
    });

    if (cleanupError) {
      console.error('Error cleaning up duplicates:', cleanupError);
      // Try alternative approach
      console.log('Trying alternative cleanup approach...');
      
      // Get all duplicates and delete them manually
      const { data: allDistributions } = await supabaseAdmin
        .from('token_distributions')
        .select('*')
        .order('user_email, subscription_id, distribution_date, created_at');

      if (allDistributions) {
        const toDelete: string[] = [];
        const seen = new Set<string>();

        for (const dist of allDistributions) {
          const key = `${dist.user_email}-${dist.subscription_id}-${dist.distribution_date}`;
          if (seen.has(key)) {
            toDelete.push(dist.id);
          } else {
            seen.add(key);
          }
        }

        console.log(`🗑️ Deleting ${toDelete.length} duplicate records...`);
        
        for (const id of toDelete) {
          await supabaseAdmin
            .from('token_distributions')
            .delete()
            .eq('id', id);
        }
      }
    } else {
      console.log('✅ Duplicates cleaned up successfully');
    }

    // Step 3: Add unique constraint
    const constraintSQL = `
      -- Add unique constraint to prevent future duplicates
      ALTER TABLE token_distributions 
      ADD CONSTRAINT unique_distribution_per_subscription_per_day 
      UNIQUE (user_email, subscription_id, distribution_date);
    `;

    const { error: constraintError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: constraintSQL
    });

    if (constraintError) {
      console.error('Error adding constraint:', constraintError);
      
      // Check if constraint already exists
      if (constraintError.message?.includes('already exists')) {
        console.log('✅ Constraint already exists');
      } else {
        return NextResponse.json({
          error: 'Failed to add unique constraint',
          details: constraintError.message
        }, { status: 500 });
      }
    } else {
      console.log('✅ Unique constraint added successfully');
    }

    // Step 4: Verify the fix
    const { data: remainingDuplicates } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, subscription_id, distribution_date, count(*)')
      .group('user_email, subscription_id, distribution_date')
      .having('count(*) > 1');

    console.log(`📊 Remaining duplicates after fix: ${remainingDuplicates?.length || 0}`);

    // Step 5: Get summary statistics
    const { data: totalDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('id', { count: 'exact' });

    const { data: uniqueUsers } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email')
      .group('user_email');

    return NextResponse.json({
      success: true,
      message: 'Token distributions constraint fix completed',
      summary: {
        total_distributions: totalDistributions?.length || 0,
        unique_users: uniqueUsers?.length || 0,
        duplicates_before: duplicates?.length || 0,
        duplicates_after: remainingDuplicates?.length || 0,
        constraint_added: !constraintError || constraintError.message?.includes('already exists')
      }
    });

  } catch (error) {
    console.error('Error in token distributions constraint fix:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check current status of token_distributions table
export async function GET() {
  try {
    // Check for duplicates
    const { data: duplicates } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, subscription_id, distribution_date, count(*)')
      .group('user_email, subscription_id, distribution_date')
      .having('count(*) > 1');

    // Get total count
    const { data: total } = await supabaseAdmin
      .from('token_distributions')
      .select('id', { count: 'exact' });

    // Check if constraint exists
    const constraintCheckSQL = `
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'token_distributions' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%subscription%';
    `;

    const { data: constraints } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: constraintCheckSQL
    });

    return NextResponse.json({
      total_distributions: total?.length || 0,
      duplicate_groups: duplicates?.length || 0,
      constraint_exists: constraints && constraints.length > 0,
      duplicates: duplicates || []
    });

  } catch (error) {
    console.error('Error checking token distributions status:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
