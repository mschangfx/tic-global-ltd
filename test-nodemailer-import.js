#!/usr/bin/env node

/**
 * Test nodemailer import and basic functionality
 */

require('dotenv').config({ path: '.env.local' });

const testNodemailerImport = async () => {
  console.log('🧪 Testing Nodemailer Import and Configuration');
  console.log('==============================================\n');

  try {
    // Test import
    console.log('📦 Testing nodemailer import...');
    const nodemailer = require('nodemailer');
    console.log('✅ Nodemailer imported successfully');
    console.log('📋 Available methods:', Object.keys(nodemailer).slice(0, 5).join(', '), '...');

    // Test createTransport function
    console.log('\n🔧 Testing createTransport function...');
    if (typeof nodemailer.createTransport === 'function') {
      console.log('✅ createTransport function available');
    } else {
      console.log('❌ createTransport function not available');
      console.log('Available methods:', Object.keys(nodemailer));
      return;
    }

    // Test configuration
    console.log('\n📧 Testing email configuration...');
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    console.log('📋 SMTP Configuration:');
    console.log('Host:', config.host);
    console.log('Port:', config.port);
    console.log('Secure:', config.secure);
    console.log('User:', config.auth.user);
    console.log('Password:', config.auth.pass ? '[SET - ' + config.auth.pass.length + ' chars]' : '[NOT SET]');

    // Create transporter
    console.log('\n🚀 Creating email transporter...');
    const transporter = nodemailer.createTransport(config);
    console.log('✅ Transporter created successfully');

    // Verify transporter
    console.log('\n🔍 Verifying transporter connection...');
    try {
      await transporter.verify();
      console.log('✅ Email transporter verified successfully');
      console.log('🎉 Email configuration is working!');
      
      // Test sending email
      console.log('\n📧 Testing email sending...');
      const testEmail = {
        from: process.env.SMTP_EMAIL,
        to: 'mschangfx@gmail.com',
        subject: 'TIC GLOBAL - Email Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">TIC GLOBAL Email Test</h2>
            <p>This is a test email from your TIC GLOBAL website.</p>
            <p>If you receive this email, your email configuration is working correctly!</p>
            <p>Time: ${new Date().toLocaleString()}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              TIC GLOBAL Ltd.<br>
              Naga world samdech techo hun Sen park<br>
              Phnom Penh 120101, Cambodia
            </p>
          </div>
        `
      };

      const result = await transporter.sendMail(testEmail);
      console.log('✅ Test email sent successfully!');
      console.log('📋 Message ID:', result.messageId);
      console.log('📧 Email sent to: mschangfx@gmail.com');
      console.log('🔍 Check the email inbox for the test message');

    } catch (verifyError) {
      console.log('❌ Email transporter verification failed:', verifyError.message);
      
      if (verifyError.code === 'EAUTH') {
        console.log('💡 Authentication failed - check email credentials');
      } else if (verifyError.code === 'ENOTFOUND') {
        console.log('💡 SMTP server not found - check SMTP_HOST setting');
      } else if (verifyError.code === 'ECONNECTION') {
        console.log('💡 Connection failed - check SMTP_HOST and SMTP_PORT');
      }
      
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Verify SMTP_HOST is correct for PrivateEmail');
      console.log('2. Check SMTP_PORT (try 587, 465, or 25)');
      console.log('3. Verify email credentials are correct');
      console.log('4. Check if SMTP_SECURE should be true/false');
    }

  } catch (error) {
    console.log('💥 Error:', error.message);
    console.log('Stack:', error.stack);
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. If test email was sent successfully, restart your dev server');
  console.log('2. Test forgot password form again');
  console.log('3. Check email inbox for reset messages');
  console.log('4. If still failing, try alternative SMTP settings');
};

testNodemailerImport();
