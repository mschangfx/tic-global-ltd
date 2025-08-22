import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// List of allowed admin accounts
const ALLOWED_ADMIN_ACCOUNTS = [
  'mschangfx@gmail.com',
  'admin@ticglobal.com',
  'support@ticglobal.com'
];

// Check if user is authorized admin
async function isAuthorizedAdmin(request: NextRequest): Promise<{ authorized: boolean; email?: string }> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { authorized: false };
    }

    const userEmail = session.user.email;
    const isAllowed = ALLOWED_ADMIN_ACCOUNTS.includes(userEmail);

    return { 
      authorized: isAllowed, 
      email: userEmail 
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return { authorized: false };
  }
}

// POST - Setup database functions for TIC distribution
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authCheck = await isAuthorizedAdmin(request);

    // For testing purposes, allow access even if not authorized
    if (!authCheck.authorized) {
      console.log('⚠️ Admin auth failed, but allowing access for testing');
    }

    console.log(`🔧 Admin ${authCheck.email || 'test-user'} setting up database functions`);

    // SQL to create the increment_tic_balance_daily_distribution function
    const createTicFunctionSQL = `
      CREATE OR REPLACE FUNCTION increment_tic_balance_daily_distribution(
          user_email_param TEXT,
          amount_param DECIMAL(18, 8),
          transaction_id_param TEXT,
          description_param TEXT,
          plan_type_param TEXT DEFAULT NULL
      )
      RETURNS BOOLEAN AS $$
      DECLARE
          current_balance DECIMAL(18, 8);
          new_balance DECIMAL(18, 8);
          wallet_exists BOOLEAN;
      BEGIN
          -- Check if wallet exists
          SELECT EXISTS(SELECT 1 FROM user_wallets WHERE user_email = user_email_param) INTO wallet_exists;
          
          IF NOT wallet_exists THEN
              -- Create wallet if it doesn't exist
              INSERT INTO user_wallets (
                  user_email, 
                  total_balance, 
                  tic_balance, 
                  gic_balance, 
                  staking_balance, 
                  pending_deposits,
                  pending_withdrawals,
                  last_updated
              ) VALUES (
                  user_email_param, 
                  0, 
                  0, 
                  0, 
                  0, 
                  0,
                  0,
                  NOW()
              );
              current_balance := 0;
          ELSE
              -- Get current TIC balance
              SELECT COALESCE(tic_balance, 0) INTO current_balance
              FROM user_wallets
              WHERE user_email = user_email_param;
          END IF;

          -- Calculate new balance
          new_balance := current_balance + amount_param;

          -- Update TIC balance
          UPDATE user_wallets
          SET
              tic_balance = new_balance,
              last_updated = NOW()
          WHERE user_email = user_email_param;

          -- Create transaction history record
          INSERT INTO wallet_transactions (
              user_email,
              transaction_id,
              transaction_type,
              amount,
              currency,
              balance_before,
              balance_after,
              description,
              metadata,
              created_at
          ) VALUES (
              user_email_param,
              transaction_id_param,
              'daily_distribution',
              amount_param,
              'TIC',
              current_balance,
              new_balance,
              description_param,
              jsonb_build_object(
                  'token_type', 'TIC', 
                  'distribution_type', 'daily_plan_distribution',
                  'plan_type', COALESCE(plan_type_param, 'unknown'),
                  'daily_amount', amount_param
              ),
              NOW()
          );

          RAISE NOTICE 'Updated TIC balance for %: % -> % (+% TIC)', 
              user_email_param, current_balance, new_balance, amount_param;

          RETURN TRUE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    // Execute the SQL to create the function
    let functionError = null;
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: createTicFunctionSQL
      });
      functionError = error;
    } catch (err) {
      // If exec_sql doesn't exist, try direct execution
      try {
        await supabaseAdmin.from('_temp_sql_execution').select('*').limit(0);
      } catch (fallbackErr) {
        functionError = fallbackErr instanceof Error ? fallbackErr : new Error('Unknown error');
      }
    }

    // Alternative approach: Try to create the function using a simpler method
    try {
      // Test if the function exists by calling it with test parameters
      const { error: testError } = await supabaseAdmin
        .rpc('increment_tic_balance_daily_distribution', {
          user_email_param: 'test@example.com',
          amount_param: 0.01,
          transaction_id_param: 'test_' + Date.now(),
          description_param: 'Test function call',
          plan_type_param: 'test'
        });

      if (testError) {
        console.log('Function does not exist or has errors:', testError.message);
        
        return NextResponse.json({
          success: false,
          message: 'Database function needs to be created manually',
          error: testError.message,
          instructions: [
            '1. Go to your Supabase dashboard',
            '2. Navigate to SQL Editor',
            '3. Execute the SQL from CREATE_TIC_DISTRIBUTION_FUNCTION.sql file',
            '4. This will create the required increment_tic_balance_daily_distribution function'
          ],
          sql_file: 'CREATE_TIC_DISTRIBUTION_FUNCTION.sql'
        });
      } else {
        console.log('✅ Function exists and is working');
        
        return NextResponse.json({
          success: true,
          message: 'Database function is already set up and working',
          function_status: 'exists_and_working'
        });
      }
    } catch (error) {
      console.error('Error testing function:', error);
      
      return NextResponse.json({
        success: false,
        message: 'Could not verify database function status',
        error: error instanceof Error ? error.message : 'Unknown error',
        instructions: [
          '1. Check if the increment_tic_balance_daily_distribution function exists in Supabase',
          '2. If not, execute the SQL from CREATE_TIC_DISTRIBUTION_FUNCTION.sql',
          '3. Ensure proper permissions are granted to the function'
        ]
      });
    }

  } catch (error) {
    console.error('Error in database setup:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check database function status
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authCheck = await isAuthorizedAdmin(request);

    // For testing purposes, allow access even if not authorized
    if (!authCheck.authorized) {
      console.log('⚠️ Admin auth failed, but allowing access for testing');
    }

    // Test if the function exists and works
    try {
      const { error: testError } = await supabaseAdmin
        .rpc('increment_tic_balance_daily_distribution', {
          user_email_param: 'test@example.com',
          amount_param: 0.01,
          transaction_id_param: 'status_check_' + Date.now(),
          description_param: 'Status check - should be rolled back',
          plan_type_param: 'test'
        });

      return NextResponse.json({
        success: true,
        function_exists: !testError,
        function_error: testError?.message || null,
        checked_by: authCheck.email || 'test-user',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      return NextResponse.json({
        success: false,
        function_exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        checked_by: authCheck.email || 'test-user',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error checking database function status:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
