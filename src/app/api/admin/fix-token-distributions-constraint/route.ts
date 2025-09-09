import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// POST - Add unique constraint to token_distributions table and clean up duplicates
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting token_distributions constraint fix...');

    // Step 1: Check current duplicates by getting all distributions and finding duplicates
    const { data: allDistributions, error: fetchError } = await supabaseAdmin
      .from('token_distributions')
      .select('id, user_email, subscription_id, distribution_date, created_at')
      .order('user_email, subscription_id, distribution_date, created_at');

    if (fetchError) {
      console.error('Error fetching distributions:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch distributions',
        details: fetchError.message
      }, { status: 500 });
    }

    // Find duplicates
    const duplicateGroups = new Map<string, any[]>();
    const seen = new Set<string>();

    for (const dist of allDistributions || []) {
      const key = `${dist.user_email}-${dist.subscription_id}-${dist.distribution_date}`;
      if (seen.has(key)) {
        if (!duplicateGroups.has(key)) {
          duplicateGroups.set(key, []);
        }
        duplicateGroups.get(key)?.push(dist);
      } else {
        seen.add(key);
      }
    }

    console.log(`📊 Found ${duplicateGroups.size} duplicate groups`);

    // Step 2: Clean up duplicates by deleting older records, keeping only the latest one
    let deletedCount = 0;

    // Convert Map to array for iteration
    const duplicateEntries = Array.from(duplicateGroups.entries());

    for (const [key, duplicates] of duplicateEntries) {
      // Sort by created_at descending and delete all but the first (latest)
      duplicates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Delete all but the first (latest) record
      for (let i = 1; i < duplicates.length; i++) {
        const { error: deleteError } = await supabaseAdmin
          .from('token_distributions')
          .delete()
          .eq('id', duplicates[i].id);

        if (deleteError) {
          console.error(`Error deleting duplicate ${duplicates[i].id}:`, deleteError);
        } else {
          deletedCount++;
        }
      }
    }

    console.log(`🗑️ Deleted ${deletedCount} duplicate records`);

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

    // Step 4: Verify the fix by checking for remaining duplicates
    const { data: verifyDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, subscription_id, distribution_date')
      .order('user_email, subscription_id, distribution_date');

    const verifyDuplicates = new Map<string, number>();
    for (const dist of verifyDistributions || []) {
      const key = `${dist.user_email}-${dist.subscription_id}-${dist.distribution_date}`;
      verifyDuplicates.set(key, (verifyDuplicates.get(key) || 0) + 1);
    }

    const remainingDuplicateCount = Array.from(verifyDuplicates.values()).filter(count => count > 1).length;
    console.log(`📊 Remaining duplicates after fix: ${remainingDuplicateCount}`);

    // Step 5: Get summary statistics
    const { data: totalDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('id', { count: 'exact' });

    const { data: allUsers } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email');

    const uniqueUsers = [...new Set(allUsers?.map(u => u.user_email) || [])];

    return NextResponse.json({
      success: true,
      message: 'Token distributions constraint fix completed',
      summary: {
        total_distributions: totalDistributions?.length || 0,
        unique_users: uniqueUsers.length,
        duplicates_before: duplicateGroups.size,
        duplicates_after: remainingDuplicateCount,
        records_deleted: deletedCount,
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
    // Get all distributions to check for duplicates
    const { data: allDistributions } = await supabaseAdmin
      .from('token_distributions')
      .select('user_email, subscription_id, distribution_date')
      .order('user_email, subscription_id, distribution_date');

    // Find duplicates
    const duplicateGroups = new Map<string, number>();
    for (const dist of allDistributions || []) {
      const key = `${dist.user_email}-${dist.subscription_id}-${dist.distribution_date}`;
      duplicateGroups.set(key, (duplicateGroups.get(key) || 0) + 1);
    }

    const duplicateCount = Array.from(duplicateGroups.values()).filter(count => count > 1).length;

    // Get total count
    const { data: total } = await supabaseAdmin
      .from('token_distributions')
      .select('id', { count: 'exact' });

    return NextResponse.json({
      total_distributions: total?.length || 0,
      duplicate_groups: duplicateCount,
      constraint_exists: false, // We'll update this after adding the constraint
      duplicates_detail: Array.from(duplicateGroups.entries())
        .filter(([_, count]) => count > 1)
        .map(([key, count]) => ({ key, count }))
    });

  } catch (error) {
    console.error('Error checking token distributions status:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
