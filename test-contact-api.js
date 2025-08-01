#!/usr/bin/env node

/**
 * Test script for the contact form API
 * This will test if the contact form API is working correctly
 */

const testContactForm = async () => {
  const testData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 234 567 8900',
    subject: 'Test Contact Form',
    message: 'This is a test message to verify the contact form API is working correctly.'
  };

  try {
    console.log('🧪 Testing Contact Form API...');
    console.log('==============================\n');

    const response = await fetch('http://localhost:8000/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Data:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS: Contact form API is working!');
      if (result.emailSent) {
        console.log('📧 Email was sent successfully');
      } else {
        console.log('📝 Form was logged (email not configured)');
      }
    } else {
      console.log('\n❌ ERROR: Contact form API failed');
      console.log('Error details:', result.error);
    }

  } catch (error) {
    console.log('\n💥 NETWORK ERROR:', error.message);
    console.log('Make sure your development server is running on port 8000');
  }
};

// Run the test
testContactForm();
