#!/usr/bin/env node

/**
 * Test company email configuration
 */

require('dotenv').config({ path: '.env.local' });

const testCompanyEmail = async () => {
  console.log('🏢 Testing Company Email Configuration');
  console.log('=====================================\n');

  // Check current configuration
  console.log('📋 Current Email Settings:');
  console.log('SMTP_EMAIL:', process.env.SMTP_EMAIL || '[NOT SET]');
  console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '[SET - ' + process.env.SMTP_PASSWORD.length + ' chars]' : '[NOT SET]');
  console.log('');

  const email = process.env.SMTP_EMAIL;
  const password = process.env.SMTP_PASSWORD;

  if (!email || !password) {
    console.log('❌ Email credentials not configured');
    return;
  }

  // Analyze email domain
  const domain = email.split('@')[1];
  console.log('🌐 Email Domain:', domain);

  // Provide SMTP configuration guidance
  if (domain === 'ticgloballtd.com') {
    console.log('🏢 Custom Domain Email Detected');
    console.log('');
    console.log('📧 For custom domain emails, you need:');
    console.log('1. SMTP server hostname (e.g., mail.ticgloballtd.com)');
    console.log('2. SMTP port (usually 587 or 465)');
    console.log('3. Email username and password');
    console.log('4. SSL/TLS settings');
    console.log('');
    console.log('🔧 Required Environment Variables:');
    console.log('SMTP_HOST=mail.ticgloballtd.com  # Your SMTP server');
    console.log('SMTP_PORT=587                     # Usually 587 or 465');
    console.log('SMTP_EMAIL=contact@ticgloballtd.com');
    console.log('SMTP_PASSWORD=your-email-password');
    console.log('');
    console.log('💡 Contact your email provider or IT admin for:');
    console.log('- SMTP server hostname');
    console.log('- Port number');
    console.log('- Security settings (TLS/SSL)');
    console.log('');
  } else if (domain.includes('gmail')) {
    console.log('📧 Gmail Configuration');
    console.log('✅ Should work with current setup');
  } else if (domain.includes('outlook') || domain.includes('hotmail')) {
    console.log('📧 Outlook/Hotmail Configuration');
    console.log('✅ Should work with current setup');
  } else {
    console.log('📧 Custom Email Provider');
    console.log('💡 May need custom SMTP settings');
  }

  // Test the forgot password API
  console.log('🧪 Testing Forgot Password API...');
  try {
    const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'mschangfx@gmail.com' }),
    });

    const result = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📋 API Response:', result.message);

    if (response.ok) {
      console.log('✅ API is working');
      console.log('📝 Check your development server console for email sending logs');
      console.log('🔍 Look for email success/error messages');
    } else {
      console.log('❌ API failed');
    }

  } catch (error) {
    console.log('💥 API Test Error:', error.message);
    console.log('Make sure your development server is running on port 8000');
  }

  console.log('');
  console.log('🎯 Next Steps:');
  
  if (domain === 'ticgloballtd.com') {
    console.log('1. Get SMTP settings from your email provider');
    console.log('2. Add SMTP_HOST and SMTP_PORT to .env.local');
    console.log('3. Update the API to use custom SMTP settings');
    console.log('4. Test email delivery');
  } else {
    console.log('1. Check development server console for email logs');
    console.log('2. Verify email credentials are correct');
    console.log('3. Test forgot password form');
    console.log('4. Check email inbox for reset messages');
  }
};

testCompanyEmail();
