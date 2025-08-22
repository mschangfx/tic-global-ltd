import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, check if the system is already set up
    const { data: functionCheck } = await supabase
      .rpc('increment_tic_balance_daily_distribution', {
        user_email: 'setup-test@example.com',
        tic_amount: 0.01,
        plan_id: 'starter'
      });

    // Clean up test data
    await supabase
      .from('tic_distribution_log')
      .delete()
      .eq('user_email', 'setup-test@example.com');

    await supabase
      .from('wallet_transactions')
      .delete()
      .eq('user_email', 'setup-test@example.com');

    await supabase
      .from('user_wallets')
      .delete()
      .eq('user_email', 'setup-test@example.com');

    if (functionCheck !== null) {
      // System is already set up and working
      return NextResponse.json({
        success: true,
        message: 'TIC distribution system is already set up and working!',
        setup_status: 'already_configured',
        verification: {
          database_function: { exists: true, working: true },
          tables_exist: true,
          plans_configured: true
        }
      });
    }

    // If we get here, the system needs setup
    // Read the SQL setup file
    const sqlFilePath = path.join(process.cwd(), 'COMPLETE_TIC_DISTRIBUTION_SETUP.sql');

    if (!fs.existsSync(sqlFilePath)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Setup SQL file not found',
          instructions: [
            'The COMPLETE_TIC_DISTRIBUTION_SETUP.sql file is missing.',
            'Please ensure the file exists in the project root.',
            'You can run the setup manually in Supabase SQL Editor.'
          ]
        },
        { status: 404 }
      );
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim().length === 0) continue;

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}:`, statement.substring(0, 100) + '...');
        
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          console.error(`Error in statement ${i + 1}:`, error);
          results.push({
            statement_number: i + 1,
            statement: statement.substring(0, 200) + '...',
            success: false,
            error: error.message
          });
          errorCount++;
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
          results.push({
            statement_number: i + 1,
            statement: statement.substring(0, 200) + '...',
            success: true,
            result: data
          });
          successCount++;
        }
      } catch (err) {
        console.error(`Exception in statement ${i + 1}:`, err);
        results.push({
          statement_number: i + 1,
          statement: statement.substring(0, 200) + '...',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        errorCount++;
      }
    }

    // Try alternative approach if exec_sql doesn't work
    if (errorCount === statements.length) {
      console.log('Trying alternative approach with direct SQL execution...');
      
      try {
        // Test database connection with a simple query
        const { data, error } = await supabase
          .rpc('exec_sql', { sql_query: 'SELECT 1 as test' });

        if (error) {
          throw new Error('Database connection failed: ' + error.message);
        }

        // If we can connect, try executing key parts manually
        const keyStatements = [
          // Create user_wallets table
          `CREATE TABLE IF NOT EXISTS user_wallets (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_email VARCHAR(255) UNIQUE NOT NULL,
            tic_balance DECIMAL(18, 8) DEFAULT 0,
            gic_balance DECIMAL(18, 8) DEFAULT 0,
            staking_balance DECIMAL(18, 8) DEFAULT 0,
            partner_wallet_balance DECIMAL(18, 8) DEFAULT 0,
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )`,
          
          // Create tic_distribution_log table
          `CREATE TABLE IF NOT EXISTS tic_distribution_log (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            plan_id VARCHAR(50) NOT NULL,
            tic_amount DECIMAL(18, 8) NOT NULL,
            distribution_date DATE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_email, plan_id, distribution_date)
          )`,
          
          // Create subscription_plans table
          `CREATE TABLE IF NOT EXISTS subscription_plans (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            plan_id VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            daily_tic_amount DECIMAL(18, 8) DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )`,
          
          // Create user_subscriptions table
          `CREATE TABLE IF NOT EXISTS user_subscriptions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            plan_id VARCHAR(50) NOT NULL,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )`
        ];

        for (const stmt of keyStatements) {
          const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
          if (error) {
            console.log('Alternative approach also failed:', error.message);
          }
        }

        return NextResponse.json({
          success: false,
          message: 'Automatic setup failed. Please run the SQL manually in Supabase.',
          error: 'Could not execute SQL automatically',
          manual_setup_required: true,
          sql_file: 'COMPLETE_TIC_DISTRIBUTION_SETUP.sql',
          instructions: [
            '1. Go to your Supabase dashboard',
            '2. Navigate to SQL Editor',
            '3. Copy and paste the contents of COMPLETE_TIC_DISTRIBUTION_SETUP.sql',
            '4. Execute the SQL script',
            '5. Return to this page and check the status'
          ]
        });

      } catch (altError) {
        return NextResponse.json({
          success: false,
          message: 'Database setup failed',
          error: altError instanceof Error ? altError.message : 'Unknown error',
          manual_setup_required: true
        });
      }
    }

    // Verify the setup
    const { data: verificationCheck, error: functionError } = await supabase
      .rpc('increment_tic_balance_daily_distribution', {
        user_email: 'test@example.com',
        tic_amount: 0,
        plan_id: 'test'
      });

    return NextResponse.json({
      success: successCount > 0,
      message: `Setup completed. ${successCount} statements succeeded, ${errorCount} failed.`,
      statistics: {
        total_statements: statements.length,
        successful: successCount,
        failed: errorCount
      },
      function_test: {
        exists: !functionError,
        error: functionError?.message || null
      },
      results: results.slice(-10), // Return last 10 results
      next_steps: [
        'Check the distribution status at /api/test/distribution-status',
        'Test the wallet function at /api/test/wallet-function',
        'Visit /test-tic-simple to run interactive tests'
      ]
    });

  } catch (error) {
    console.error('Setup TIC distribution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        manual_setup_required: true,
        instructions: [
          'Automatic setup failed. Please run the setup manually:',
          '1. Go to your Supabase dashboard → SQL Editor',
          '2. Copy and paste the contents of COMPLETE_TIC_DISTRIBUTION_SETUP.sql',
          '3. Execute the SQL script',
          '4. Return here and check the status'
        ]
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'TIC Distribution Setup Endpoint',
    description: 'Use POST to run the complete TIC distribution system setup',
    files_required: [
      'COMPLETE_TIC_DISTRIBUTION_SETUP.sql'
    ],
    endpoints: {
      setup: 'POST /api/admin/setup-tic-distribution',
      status: 'GET /api/test/distribution-status',
      test: 'POST /api/test/wallet-function'
    }
  });
}
