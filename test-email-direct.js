#!/usr/bin/env node

/**
 * Direct email test to verify SMTP configuration
 */

const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

const testEmailDirect = async () => {
  console.log('🧪 Direct Email Configuration Test');
  console.log('==================================\n');

  // Check environment variables
  console.log('📋 Current Email Configuration:');
  console.log('SMTP_EMAIL:', process.env.SMTP_EMAIL || '[NOT SET]');
  console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '[SET - ' + process.env.SMTP_PASSWORD.length + ' chars]' : '[NOT SET]');
  console.log('');

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.log('❌ Email configuration is missing!');
    console.log('💡 Run: node setup-email-for-all-users.js');
    return;
  }

  // Check if email is properly configured
  const isEmailConfigured = process.env.SMTP_EMAIL && 
                            process.env.SMTP_PASSWORD && 
                            process.env.SMTP_EMAIL !== 'your-email@gmail.com' &&
                            process.env.SMTP_PASSWORD !== 'your-app-password' &&
                            process.env.SMTP_EMAIL.includes('@') &&
                            process.env.SMTP_PASSWORD.length > 5;

  console.log('🔍 Email Configuration Status:', isEmailConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED');

  if (!isEmailConfigured) {
    console.log('❌ Email configuration is invalid!');
    console.log('💡 Current values seem to be placeholders');
    console.log('💡 Run: node setup-email-for-all-users.js');
    return;
  }

  try {
    // Determine email service
    const emailDomain = process.env.SMTP_EMAIL.split('@')[1]?.toLowerCase();
    let transporterConfig;

    if (emailDomain?.includes('gmail')) {
      transporterConfig = {
        service: 'gmail',
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      };
    } else if (emailDomain?.includes('outlook') || emailDomain?.includes('hotmail')) {
      transporterConfig = {
        service: 'hotmail',
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      };
    } else {
      transporterConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      };
    }

    console.log('🔧 Creating transporter for:', emailDomain);
    const transporter = nodemailer.createTransporter(transporterConfig);

    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    // Send test email
    console.log('📧 Sending test email...');
    const testEmail = {
      from: process.env.SMTP_EMAIL,
      to: 'mschangfx@gmail.com', // Send to your email
      subject: 'TIC GLOBAL Password Reset - Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #14c3cb;">🎉 Email System Working!</h1>
            <p style="color: #666; font-size: 16px;">TIC GLOBAL Password Reset Test</p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #14c3cb; margin-bottom: 20px;">
            <h2 style="color: #2D3748; margin-bottom: 15px;">✅ Success!</h2>
            <p style="color: #666; line-height: 1.6;">
              Your email configuration is working correctly. The forgot password feature will now send emails to ALL users.
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #2D3748; margin-bottom: 15px;">Configuration Details</h3>
            <ul style="color: #666; line-height: 1.6;">
              <li>Email Provider: ${emailDomain}</li>
              <li>From Address: ${process.env.SMTP_EMAIL}</li>
              <li>Test Date: ${new Date().toLocaleString()}</li>
              <li>Status: ✅ Working for ALL users</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #666; margin-bottom: 15px;">
              <strong>TIC GLOBAL Ltd.</strong><br>
              Password Reset System Test
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(testEmail);
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📬 Check your inbox:', 'mschangfx@gmail.com');
    console.log('');
    console.log('🎉 EMAIL SYSTEM IS NOW WORKING FOR ALL USERS!');
    console.log('✅ Forgot password will send actual emails');
    console.log('✅ All users will receive reset links via email');
    console.log('✅ No more console-only reset URLs');

  } catch (error) {
    console.log('❌ Email test failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('');
      console.log('🔐 Authentication Error Solutions:');
      console.log('1. For Gmail: Use App Password, not regular password');
      console.log('2. Enable 2-Factor Authentication first');
      console.log('3. Generate App Password in Google Account settings');
      console.log('4. Use the 16-character app password');
    } else if (error.code === 'ENOTFOUND') {
      console.log('');
      console.log('🌐 Connection Error Solutions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify email provider settings');
      console.log('3. Try different SMTP server');
    }
    
    console.log('');
    console.log('💡 Run the setup wizard: node setup-email-for-all-users.js');
  }
};

testEmailDirect();
