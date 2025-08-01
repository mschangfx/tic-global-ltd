#!/usr/bin/env node

/**
 * Generate a test reset link for immediate testing
 */

const crypto = require('crypto');

const generateTestResetLink = async () => {
  console.log('🔗 Generating test reset link...');
  
  // Generate a test token
  const testToken = crypto.randomBytes(32).toString('hex');
  
  // Create the reset URL
  const resetUrl = `http://localhost:8000/reset-password?token=${testToken}`;
  
  console.log('✅ Test reset link generated:');
  console.log('🔗 URL:', resetUrl);
  console.log('🎫 Token:', testToken);
  
  // Try to register this token with the API
  try {
    console.log('\n📧 Requesting reset for mschangfx@gmail.com...');
    
    const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'mschangfx@gmail.com' }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Reset request successful!');
      console.log('📝 Response:', result.message);
      console.log('\n🎯 Now you can test the forgot password flow:');
      console.log('1. Go to: http://localhost:8000/forgot-password');
      console.log('2. Enter email: mschangfx@gmail.com');
      console.log('3. Check your development server console for the actual reset URL');
      console.log('4. Or try the test URL above (may not work if using in-memory storage)');
    } else {
      console.log('❌ Reset request failed:', result.error);
    }

  } catch (error) {
    console.log('💥 Error making request:', error.message);
    console.log('Make sure your development server is running on port 8000');
  }
  
  console.log('\n📋 Manual Testing Steps:');
  console.log('1. Start your dev server: npm run dev');
  console.log('2. Go to: http://localhost:8000/forgot-password');
  console.log('3. Enter: mschangfx@gmail.com');
  console.log('4. Check server console for reset URL');
  console.log('5. Copy the reset URL and test password reset');
};

generateTestResetLink();
