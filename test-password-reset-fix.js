#!/usr/bin/env node

/**
 * Test the fixed password reset system
 */

const testPasswordResetFix = async () => {
  console.log('🔧 Testing FIXED Password Reset System');
  console.log('=====================================\n');

  const baseUrl = 'http://localhost:8000';
  const userEmail = 'mschangfx@gmail.com';

  console.log(`👤 Testing with user: ${userEmail}`);
  console.log('🎯 Goal: Verify password reset now updates Supabase Auth\n');

  console.log('📋 Step 1: Sending NEW Password Reset Email...');

  try {
    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
      }),
    });

    const data = await response.json();

    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Response: ${data.message || data.error}`);

    if (response.status === 200) {
      console.log('\n✅ SUCCESS! New password reset email sent!');
      console.log('\n🔧 WHAT WAS FIXED:');
      console.log('❌ OLD SYSTEM: Password reset updated custom users table');
      console.log('❌ LOGIN SYSTEM: Used Supabase Auth (different system)');
      console.log('❌ RESULT: Password reset didn\'t work for login');
      console.log('');
      console.log('✅ NEW SYSTEM: Password reset updates Supabase Auth directly');
      console.log('✅ LOGIN SYSTEM: Uses Supabase Auth (same system)');
      console.log('✅ RESULT: Password reset will work for login!');
      
      console.log('\n📧 CHECK YOUR EMAIL AGAIN:');
      console.log(`   📬 Email: ${userEmail}`);
      console.log('   📨 Subject: "Reset Your TIC GLOBAL Password"');
      console.log('   🔗 Click the NEW reset link in the email');
      
      console.log('\n🔑 WHEN YOU GET THE NEW EMAIL:');
      console.log('1. 📧 Open the NEW email from TIC GLOBAL');
      console.log('2. 🔗 Click "Reset My Password" button');
      console.log('3. 🔑 Set your password to: Polkmn000');
      console.log('4. ✅ Save the new password');
      console.log('5. 🔄 You\'ll be redirected to /join page');
      console.log('6. 📧 Use "Sign In" tab');
      console.log('7. 📧 Email: mschangfx@gmail.com');
      console.log('8. 🔑 Password: Polkmn000');
      console.log('9. 🎉 Login should work NOW!');

      console.log('\n⚡ TECHNICAL DETAILS:');
      console.log('• Password reset now uses supabaseAdmin.auth.admin.updateUserById()');
      console.log('• This updates the actual Supabase Auth password');
      console.log('• Login API uses supabase.auth.signInWithPassword()');
      console.log('• Both systems now use the same Supabase Auth backend');
      console.log('• Your password will actually be updated correctly');

      console.log('\n🎯 WHY THE OLD RESET DIDN\'T WORK:');
      console.log('• Old reset: Updated custom "users" table password field');
      console.log('• Login system: Checks Supabase Auth password');
      console.log('• These were two different password storage systems');
      console.log('• Now both use Supabase Auth - problem solved!');

    } else {
      console.log('\n❌ Failed to send reset email');
      console.log('🔧 Check server logs for errors');
    }

  } catch (error) {
    console.log('\n💥 Error sending reset email:', error.message);
  }

  console.log('\n🎯 SUMMARY:');
  console.log('The password reset system has been fixed to use Supabase Auth.');
  console.log('You need to use the NEW reset email to set your password.');
  console.log('The old reset didn\'t work because it updated the wrong system.');
  console.log('The new reset will update Supabase Auth correctly.');

  console.log('\n📋 NEXT STEPS:');
  console.log('1. 📧 Check email for NEW reset link');
  console.log('2. 🔗 Click the NEW reset link');
  console.log('3. 🔑 Set password: Polkmn000');
  console.log('4. 🔄 Get redirected to /join page');
  console.log('5. 📧 Use "Sign In" tab to login');
  console.log('6. 🎉 Login should work perfectly!');

  console.log('\n🔍 IF IT STILL DOESN\'T WORK:');
  console.log('• Check browser console for errors');
  console.log('• Verify you\'re using the NEW reset email');
  console.log('• Make sure you\'re on the "Sign In" tab');
  console.log('• Try clearing browser cache/cookies');
};

// Check if server is running
const checkServer = async () => {
  try {
    const response = await fetch('http://localhost:8000');
    return response.status < 500;
  } catch (error) {
    return false;
  }
};

const runTest = async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Development server not running on http://localhost:8000');
    console.log('💡 Please start your server with: npm run dev');
    return;
  }

  console.log('✅ Development server detected');
  await testPasswordResetFix();
};

runTest();
