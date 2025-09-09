import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Test if referral_code column exists
    const { data: testUser, error: testError } = await supabaseAdmin
      .from('users')
      .select('email, referral_code, referral_id')
      .limit(1);

    if (testError) {
      return NextResponse.json({
        status: 'error',
        message: 'Referral columns do not exist in users table',
        error: testError.message,
        suggestion: 'Please run the database migration: database-migration-referral-system.sql'
      });
    }

    // Test if referral_earnings table exists
    const { data: testEarnings, error: earningsError } = await supabaseAdmin
      .from('referral_earnings')
      .select('*')
      .limit(1);

    if (earningsError) {
      return NextResponse.json({
        status: 'partial',
        message: 'Users table has referral columns but referral_earnings table is missing',
        error: earningsError.message,
        suggestion: 'Please run the complete database migration: database-migration-referral-system.sql'
      });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Referral system database structure is properly set up',
      usersTableColumns: testUser ? Object.keys(testUser[0] || {}) : [],
      referralEarningsExists: true
    });

  } catch (error) {
    console.error('Error testing referral database:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to test database structure',
      error: error instanceof Error ? (error as Error).message : 'Unknown error'
    });
  }
}
