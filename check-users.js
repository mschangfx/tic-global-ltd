#!/usr/bin/env node

/**
 * Check what users exist in the system
 */

require('dotenv').config({ path: '.env.local' });

const checkUsers = async () => {
  console.log('👥 Checking TIC GLOBAL Users in System');
  console.log('=====================================\n');

  try {
    // Import Supabase admin client
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Missing Supabase environment variables');
      console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
      console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Fetching users from Supabase Auth...');
    
    // Get users from Supabase Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message);
      return;
    }

    console.log(`📊 Found ${authUsers.users.length} users in Supabase Auth:\n`);

    authUsers.users.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   📅 Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   ✅ Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   🔐 Provider: ${user.app_metadata?.provider || 'email'}`);
      console.log('');
    });

    // Also check custom users table if it exists
    console.log('🔍 Checking custom users table...');
    const { data: customUsers, error: customError } = await supabase
      .from('users')
      .select('*');

    if (customError) {
      console.log('ℹ️  No custom users table or error:', customError.message);
    } else {
      console.log(`📊 Found ${customUsers.length} users in custom users table:\n`);
      customUsers.forEach((user, index) => {
        console.log(`👤 Custom User ${index + 1}:`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🆔 ID: ${user.id}`);
        console.log(`   🔐 Provider: ${user.provider || 'unknown'}`);
        console.log('');
      });
    }

    console.log('🎯 Authentication Test Recommendations:');
    console.log('1. Try logging in with the emails listed above');
    console.log('2. If you know the password for any user, test with correct/incorrect passwords');
    console.log('3. Create a new test user if needed');
    console.log('4. Check if you\'re testing with the right credentials');

    console.log('\n📝 To create a test user:');
    console.log('1. Go to http://localhost:8000/join');
    console.log('2. Click "Create an account" tab');
    console.log('3. Register with a test email and password');
    console.log('4. Then test login with correct/incorrect passwords');

  } catch (error) {
    console.log('💥 Error:', error.message);
  }
};

checkUsers();
