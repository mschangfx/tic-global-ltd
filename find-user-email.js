#!/usr/bin/env node

/**
 * Script to find your user email for testing transaction history
 */

require('dotenv').config({ path: '.env.local' });

const findUserEmail = async () => {
  console.log('🔍 Finding Your User Email for Transaction History');
  console.log('================================================\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Missing Supabase environment variables');
      console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
      console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
      console.log('\nPlease check your .env.local file');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users from Supabase Auth
    console.log('📋 Checking Supabase Auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message);
      return;
    }

    if (!authUsers || authUsers.users.length === 0) {
      console.log('❌ No users found in Supabase Auth');
      console.log('\nYou need to:');
      console.log('1. Sign up/login to your app first');
      console.log('2. Then run this script to find your email');
      return;
    }

    console.log(`✅ Found ${authUsers.users.length} user(s) in Supabase Auth:\n`);

    authUsers.users.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   Provider: ${user.app_metadata?.provider || 'email'}`);
      console.log('');
    });

    // Show the SQL command to use
    if (authUsers.users.length > 0) {
      const firstUserEmail = authUsers.users[0].email;
      
      console.log('🔧 To test transaction history with your email:');
      console.log('==============================================\n');
      
      console.log('1. Copy this SQL and run it in Supabase SQL Editor:');
      console.log('   (Replace the test data email with your actual email)\n');
      
      console.log(`-- Update TEST_TRANSACTION_DATA.sql with your email:`);
      console.log(`-- Replace 'your-email@example.com' with '${firstUserEmail}'`);
      console.log('');
      
      console.log('2. Or run this quick test insert:');
      console.log('');
      console.log(`INSERT INTO public.deposits (
    user_email, amount, currency, method_id, method_name, network,
    deposit_address, wallet_address, final_amount, status, created_at
) VALUES (
    '${firstUserEmail}', 100.00, 'USD', 'usdt-trc20', 'USDT', 'TRC20',
    'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF', 'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF',
    100.00, 'completed', NOW() - INTERVAL '1 day'
);`);
      console.log('');
      
      console.log('3. Then visit: http://localhost:8000/wallet/history');
      console.log('');
    }

    // Check if user already has transactions
    console.log('📊 Checking existing transactions...');
    
    for (const user of authUsers.users) {
      const email = user.email;
      
      // Check deposits
      const { data: deposits, error: depositsError } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_email', email);
      
      // Check withdrawals  
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_email', email);
      
      const depositCount = deposits?.length || 0;
      const withdrawalCount = withdrawals?.length || 0;
      
      if (depositCount > 0 || withdrawalCount > 0) {
        console.log(`\n💰 ${email} already has:`);
        console.log(`   Deposits: ${depositCount}`);
        console.log(`   Withdrawals: ${withdrawalCount}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

findUserEmail();
