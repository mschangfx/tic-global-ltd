#!/usr/bin/env node

/**
 * Help user set up password for existing account
 */

const setupPassword = async () => {
  console.log('🔑 Setting Up Password for Existing Account');
  console.log('==========================================\n');

  const baseUrl = 'http://localhost:8000';
  const userEmail = 'mschangfx@gmail.com';

  console.log(`👤 User: ${userEmail}`);
  console.log('🎯 Goal: Set up password for email/password login\n');

  console.log('📋 Step 1: Sending Password Reset Email...');

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
      console.log('\n✅ SUCCESS! Password reset email sent!');
      console.log('\n📧 CHECK YOUR EMAIL:');
      console.log(`   📬 Email: ${userEmail}`);
      console.log('   📨 Subject: "Reset Your TIC GLOBAL Password"');
      console.log('   🔗 Click the reset link in the email');
      
      console.log('\n🔑 WHEN YOU GET THE EMAIL:');
      console.log('1. 📧 Open the email from TIC GLOBAL');
      console.log('2. 🔗 Click "Reset My Password" button');
      console.log('3. 🔑 Set your password to: Polkmn000');
      console.log('4. ✅ Save the new password');
      console.log('5. 🔄 Return to login page');
      console.log('6. 📧 Email: mschangfx@gmail.com');
      console.log('7. 🔑 Password: Polkmn000');
      console.log('8. 🎉 Login should work!');

      console.log('\n⏰ EMAIL DELIVERY:');
      console.log('• Email should arrive within 1-2 minutes');
      console.log('• Check spam/junk folder if not in inbox');
      console.log('• Reset link expires in 24 hours');

    } else {
      console.log('\n❌ Failed to send reset email');
      console.log('🔧 Alternative solutions:');
      console.log('1. Try Google Sign-In button instead');
      console.log('2. Create new account with different email');
      console.log('3. Check server logs for errors');
    }

  } catch (error) {
    console.log('\n💥 Error sending reset email:', error.message);
    console.log('\n🔧 Alternative solutions:');
    console.log('1. 🔗 Go to: http://localhost:8000/join');
    console.log('2. 🔘 Click "Google" button for immediate access');
    console.log('3. 🆕 Or create new account with different email');
  }

  console.log('\n🎯 SUMMARY:');
  console.log('Your account exists but needs a password set up.');
  console.log('Use forgot password to enable email/password login,');
  console.log('or use Google Sign-In for immediate access.');
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

const runSetup = async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Development server not running on http://localhost:8000');
    console.log('💡 Please start your server with: npm run dev');
    return;
  }

  console.log('✅ Development server detected');
  await setupPassword();
};

runSetup();
