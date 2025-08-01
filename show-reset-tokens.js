#!/usr/bin/env node

/**
 * Script to show current reset tokens (for testing)
 */

const showTokens = async () => {
  console.log('🔍 Checking for reset tokens...');
  
  // Make a request to get a token first
  try {
    const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'mschangfx@gmail.com' }),
    });

    const result = await response.json();
    console.log('📊 Forgot Password Response:', result);

    if (response.ok) {
      console.log('\n✅ Reset token should be generated!');
      console.log('🔗 Check your development server console for the reset URL');
      console.log('📝 Look for lines like:');
      console.log('   === PASSWORD RESET REQUEST ===');
      console.log('   Reset URL: http://localhost:8000/reset-password?token=...');
      console.log('   ===============================');
    }

  } catch (error) {
    console.log('💥 Error:', error.message);
    console.log('Make sure your development server is running on port 8000');
  }
};

showTokens();
