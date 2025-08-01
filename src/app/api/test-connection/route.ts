import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    // Test 1: Basic connection
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    // Test 2: Check if auth works
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    const results = {
      status: 'success',
      tests: {
        database_connection: userError ? 'failed' : 'success',
        auth_connection: authError ? 'failed' : 'success',
        users_table: userError ? userError.message : 'accessible',
        auth_service: authError ? authError.message : 'accessible'
      },
      timestamp: new Date().toISOString()
    };

    if (userError || authError) {
      console.error('Connection issues:', { userError, authError });
      return NextResponse.json(results, { status: 500 });
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
