#!/usr/bin/env node

/**
 * Debug specific user authentication issue
 */

require('dotenv').config({ path: '.env.local' });

const debugUserAuth = async () => {
  console.log('🔍 Debugging User Authentication Issue');
  console.log('=====================================\n');

  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Missing Supabase environment variables');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userEmail = 'test-user@example.com'; // Replace with actual user email for testing
    console.log(`🔍 Investigating user: ${userEmail}\n`);

    // Get detailed user info from Supabase Auth
    console.log('📋 Checking Supabase Auth user details...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message);
      return;
    }

    const targetUser = authUsers.users.find(user => user.email === userEmail);

    if (!targetUser) {
      console.log('❌ User not found in Supabase Auth');
      return;
    }

    console.log('👤 User Details:');
    console.log(`   📧 Email: ${targetUser.email}`);
    console.log(`   🆔 ID: ${targetUser.id}`);
    console.log(`   📅 Created: ${new Date(targetUser.created_at).toLocaleDateString()}`);
    console.log(`   ✅ Email Confirmed: ${targetUser.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   🔐 Provider: ${targetUser.app_metadata?.provider || 'email'}`);
    console.log(`   🔑 Has Password: ${targetUser.encrypted_password ? 'Yes' : 'No'}`);
    console.log(`   📱 Providers: ${targetUser.app_metadata?.providers?.join(', ') || 'email'}`);

    // Check if user was created via Google OAuth
    if (targetUser.app_metadata?.provider === 'google' || 
        (targetUser.app_metadata?.providers && targetUser.app_metadata.providers.includes('google'))) {
      console.log('\n🔍 ISSUE IDENTIFIED:');
      console.log('❌ This user was created via Google OAuth');
      console.log('❌ Google OAuth users don\'t have email/password credentials');
      console.log('❌ They can only login through Google Sign-In');
      
      console.log('\n🔧 SOLUTIONS:');
      console.log('1. 🎯 Use Google Sign-In button instead of email/password');
      console.log('2. 🔄 Reset password to enable email/password login');
      console.log('3. 🆕 Create new account with email/password');
      
      console.log('\n📋 TO FIX THIS:');
      console.log('Option A - Use Google Sign-In:');
      console.log('   • Click the "Google" button on login page');
      console.log('   • This will work immediately');
      
      console.log('\nOption B - Enable Email/Password:');
      console.log('   • Go to forgot password page');
      console.log('   • Enter your email to set a password');
      console.log('   • Then you can use email/password login');
      
      console.log('\nOption C - Create New Account:');
      console.log('   • Use different email for email/password account');
      console.log('   • Keep Google account separate');

    } else if (!targetUser.encrypted_password) {
      console.log('\n🔍 ISSUE IDENTIFIED:');
      console.log('❌ User exists but has no password set');
      console.log('❌ This can happen with OAuth-only accounts');
      
      console.log('\n🔧 SOLUTION:');
      console.log('• Use forgot password to set a password');
      console.log('• Then you can login with email/password');
      
    } else {
      console.log('\n🔍 User appears to have password set');
      console.log('🧪 Testing login with provided credentials...');
      
      // Test the actual login
      const testResponse = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail, 
          password: 'Polkmn000' 
        }),
      });
      
      const testData = await testResponse.json();
      console.log(`📊 Login Test Result: ${testResponse.status}`);
      console.log(`📋 Response: ${testData.message || testData.error}`);
      
      if (testResponse.status === 401) {
        console.log('\n🔍 POSSIBLE ISSUES:');
        console.log('• Password might be different than expected');
        console.log('• Account might have been created differently');
        console.log('• Try using forgot password to reset');
      }
    }

    // Check custom users table
    console.log('\n📋 Checking custom users table...');
    const { data: customUsers, error: customError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail);

    if (customError) {
      console.log('ℹ️  No custom users table or error:', customError.message);
    } else if (customUsers.length > 0) {
      console.log('👤 Custom Users Table Entry:');
      customUsers.forEach(user => {
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🆔 ID: ${user.id}`);
        console.log(`   🔐 Provider: ${user.provider || 'unknown'}`);
      });
    }

  } catch (error) {
    console.log('💥 Error:', error.message);
  }
};

debugUserAuth();
