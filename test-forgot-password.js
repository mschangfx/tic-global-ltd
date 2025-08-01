#!/usr/bin/env node

/**
 * Test script for the forgot password functionality
 * This will test if the forgot password API is working correctly
 */

const testForgotPassword = async () => {
  const testEmail = 'mschangfx@gmail.com'; // Using the email from your test

  try {
    console.log('🧪 Testing Forgot Password API...');
    console.log('==================================\n');

    const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail }),
    });

    const result = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS: Forgot password API is working!');
      console.log('📧 Check your console logs for reset token details');
      console.log('🔗 Look for the reset URL in the server logs');
    } else {
      console.log('\n❌ ERROR: Forgot password API failed');
      console.log('Error details:', result.error);
    }

  } catch (error) {
    console.log('\n💥 NETWORK ERROR:', error.message);
    console.log('Make sure your development server is running on port 8000');
  }
};

// Test with invalid email format
const testInvalidEmail = async () => {
  console.log('\n🧪 Testing with invalid email...');
  console.log('==================================');

  try {
    const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'invalid-email' }),
    });

    const result = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(result, null, 2));

    if (response.status === 400) {
      console.log('✅ Validation working correctly');
    } else {
      console.log('❌ Validation not working as expected');
    }

  } catch (error) {
    console.log('💥 ERROR:', error.message);
  }
};

// Run the tests
const runTests = async () => {
  await testForgotPassword();
  await testInvalidEmail();
  
  console.log('\n📝 Next Steps:');
  console.log('1. Run the database migration: database-migration-reset-tokens.sql');
  console.log('2. Test with a real email address that exists in your users table');
  console.log('3. Check server console for reset token and URL');
  console.log('4. Configure email settings if you want actual emails sent');
};

runTests();
