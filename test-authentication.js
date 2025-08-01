#!/usr/bin/env node

/**
 * Test authentication system to verify password validation
 */

const testAuthentication = async () => {
  console.log('🔐 Testing TIC GLOBAL Authentication System');
  console.log('==========================================\n');

  const baseUrl = 'http://localhost:8000';

  // Test cases
  const testCases = [
    {
      name: 'Valid User - Correct Password',
      email: 'mschangfx@gmail.com',
      password: 'correct_password_here', // You'll need to replace with actual password
      expectedStatus: 200,
      description: 'Should succeed with correct credentials'
    },
    {
      name: 'Valid User - Wrong Password',
      email: 'mschangfx@gmail.com', 
      password: 'wrong_password_123',
      expectedStatus: 401,
      description: 'Should fail with incorrect password'
    },
    {
      name: 'Invalid User - Any Password',
      email: 'nonexistent@example.com',
      password: 'any_password',
      expectedStatus: 401,
      description: 'Should fail for non-existent user'
    },
    {
      name: 'Empty Password',
      email: 'mschangfx@gmail.com',
      password: '',
      expectedStatus: 400,
      description: 'Should fail with empty password'
    }
  ];

  console.log('🧪 Running Authentication Tests...\n');

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`📧 Email: ${testCase.email}`);
    console.log(`🔑 Password: ${testCase.password ? '[HIDDEN]' : '[EMPTY]'}`);
    console.log(`🎯 Expected: ${testCase.expectedStatus} status`);
    console.log(`📝 Description: ${testCase.description}`);

    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testCase.email,
          password: testCase.password,
        }),
      });

      const data = await response.json();
      
      console.log(`📊 Actual Status: ${response.status}`);
      console.log(`📋 Response: ${data.message || data.error}`);

      if (response.status === testCase.expectedStatus) {
        console.log('✅ TEST PASSED');
      } else {
        console.log('❌ TEST FAILED');
        console.log(`   Expected: ${testCase.expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      console.log('💥 TEST ERROR:', error.message);
      console.log('❌ TEST FAILED');
    }

    console.log('─'.repeat(50));
  }

  console.log('\n🔍 Authentication Analysis:');
  console.log('1. If wrong passwords are returning 200 status, there\'s a validation issue');
  console.log('2. If all tests return 401, authentication is working correctly');
  console.log('3. Check server console for Supabase authentication errors');
  console.log('4. Verify user exists in Supabase Auth dashboard');

  console.log('\n📋 How to Fix Issues:');
  console.log('1. Check Supabase Auth configuration');
  console.log('2. Verify user registration process');
  console.log('3. Test with known valid credentials');
  console.log('4. Check server-side authentication logs');

  console.log('\n🎯 Next Steps:');
  console.log('1. Run this test with your development server running');
  console.log('2. Check the server console for authentication logs');
  console.log('3. Verify user credentials in Supabase dashboard');
  console.log('4. Test the join page with correct/incorrect passwords');
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

const runTests = async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Development server not running on http://localhost:8000');
    console.log('💡 Please start your server with: npm run dev');
    return;
  }

  console.log('✅ Development server detected');
  await testAuthentication();
};

runTests();
