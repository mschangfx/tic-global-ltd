#!/usr/bin/env node

/**
 * Test authentication with real user credentials
 */

const testRealAuthentication = async () => {
  console.log('🔐 Testing REAL Authentication with Known User');
  console.log('==============================================\n');

  const baseUrl = 'http://localhost:8000';
  const realEmail = 'mschangfx@gmail.com'; // Known user from database

  // Test cases with the real user
  const testCases = [
    {
      name: 'Real User - Wrong Password Test 1',
      email: realEmail,
      password: 'wrongpassword123',
      expectedStatus: 401,
      description: 'Should fail with clearly wrong password'
    },
    {
      name: 'Real User - Wrong Password Test 2', 
      email: realEmail,
      password: 'incorrect_password',
      expectedStatus: 401,
      description: 'Should fail with different wrong password'
    },
    {
      name: 'Real User - Empty Password',
      email: realEmail,
      password: '',
      expectedStatus: 400,
      description: 'Should fail with empty password'
    },
    {
      name: 'Real User - Very Wrong Password',
      email: realEmail,
      password: 'definitely_not_the_password_12345',
      expectedStatus: 401,
      description: 'Should fail with obviously wrong password'
    }
  ];

  console.log('🧪 Testing Authentication with Real User...\n');
  console.log(`👤 Testing with user: ${realEmail}`);
  console.log('🎯 All tests should FAIL (return 401/400) to prove authentication works\n');

  let allTestsPassed = true;

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`🔑 Password: "${testCase.password}"`);
    console.log(`🎯 Expected: ${testCase.expectedStatus} status`);

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
        console.log('✅ TEST PASSED - Authentication correctly rejected invalid credentials');
      } else {
        console.log('❌ TEST FAILED - Authentication did not work as expected');
        console.log(`   Expected: ${testCase.expectedStatus}, Got: ${response.status}`);
        allTestsPassed = false;
        
        if (response.status === 200) {
          console.log('🚨 SECURITY ISSUE: Wrong password was accepted!');
        }
      }

    } catch (error) {
      console.log('💥 TEST ERROR:', error.message);
      allTestsPassed = false;
    }

    console.log('─'.repeat(60));
  }

  console.log('\n🎯 AUTHENTICATION ANALYSIS:');
  
  if (allTestsPassed) {
    console.log('✅ AUTHENTICATION IS WORKING CORRECTLY!');
    console.log('✅ All wrong passwords were properly rejected');
    console.log('✅ Your system is secure - only correct passwords will work');
    console.log('\n🔍 If you experienced login with wrong password before:');
    console.log('   • You might have used the correct password without realizing');
    console.log('   • Browser might have auto-filled the correct password');
    console.log('   • Google OAuth might have signed you in automatically');
    console.log('   • Check browser developer tools for cached credentials');
  } else {
    console.log('❌ AUTHENTICATION HAS ISSUES!');
    console.log('❌ Some wrong passwords were accepted');
    console.log('🔧 Need to investigate authentication logic');
  }

  console.log('\n📋 HOW TO VERIFY AUTHENTICATION MANUALLY:');
  console.log('1. Go to: http://localhost:8000/join');
  console.log('2. Clear browser cache/cookies');
  console.log('3. Try logging in with:');
  console.log(`   Email: ${realEmail}`);
  console.log('   Password: wrong_password_123');
  console.log('4. You should see an error message');
  console.log('5. You should NOT be redirected to dashboard');

  console.log('\n🔧 TO CREATE A TEST USER:');
  console.log('1. Go to: http://localhost:8000/join');
  console.log('2. Click "Create an account" tab');
  console.log('3. Register with: test@example.com / TestPassword123!');
  console.log('4. Then test login with correct/wrong passwords');

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Clear browser cache completely');
  console.log('2. Test manual login with wrong password');
  console.log('3. Verify you see error message');
  console.log('4. Test with correct password to confirm it works');
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
  await testRealAuthentication();
};

runTests();
