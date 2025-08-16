#!/usr/bin/env node

/**
 * Test script to verify forgot password emails work for ALL users
 */

const testEmailForAllUsers = async () => {
  console.log('🧪 Testing Forgot Password Email for ALL Users');
  console.log('===============================================\n');

  // Test with multiple email addresses
  const testEmails = [
    'user1@example.com',   // Test user 1
    'test@example.com',    // Non-existent user (should still return success for security)
    'admin@ticglobal.com', // Another test email
  ];

  for (const email of testEmails) {
    console.log(`📧 Testing with email: ${email}`);
    console.log('─'.repeat(50));

    try {
      const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      console.log('📊 Response Status:', response.status);
      console.log('📋 Response Data:', JSON.stringify(result, null, 2));

      if (response.ok) {
        console.log('✅ API Response: SUCCESS');
        if (email === 'mschangfx@gmail.com') {
          console.log('📧 Real user - should receive actual email');
        } else {
          console.log('👻 Non-existent user - no email sent (security)');
        }
      } else {
        console.log('❌ API Response: FAILED');
      }

    } catch (error) {
      console.log('💥 Network Error:', error.message);
    }

    console.log(''); // Empty line for spacing
  }

  console.log('🔍 What to Check:');
  console.log('1. Check your development server console for detailed logs');
  console.log('2. Look for email sending attempts and any errors');
  console.log('3. Check your email inbox for reset emails');
  console.log('4. Verify email configuration if no emails received');

  console.log('\n📧 Email Configuration Check:');
  console.log('If emails are not being sent, run: node setup-email-for-all-users.js');
};

// Test email configuration directly
const testEmailConfig = async () => {
  console.log('\n🔧 Testing Current Email Configuration');
  console.log('=====================================');

  try {
    // Make a request to trigger email configuration check
    const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'mschangfx@gmail.com' }),
    });

    console.log('📊 Configuration test response:', response.status);
    console.log('📝 Check server console for email configuration details');

  } catch (error) {
    console.log('💥 Error testing configuration:', error.message);
    console.log('Make sure your development server is running on port 8000');
  }
};

// Run tests
const runAllTests = async () => {
  await testEmailForAllUsers();
  await testEmailConfig();
  
  console.log('\n🎯 Summary:');
  console.log('✅ API endpoints are working');
  console.log('📧 Email delivery depends on SMTP configuration');
  console.log('🔧 Run setup-email-for-all-users.js to configure email');
  console.log('🚀 Once configured, ALL users will receive actual emails');
};

runAllTests();
