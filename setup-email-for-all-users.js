#!/usr/bin/env node

/**
 * Email Setup Wizard for TIC GLOBAL Forgot Password
 * This will help you configure email to work for ALL users
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function testEmailConfiguration(email, password, service = 'gmail') {
  console.log('\n🧪 Testing email configuration...');
  
  try {
    let transporterConfig;
    
    if (service === 'gmail') {
      transporterConfig = {
        service: 'gmail',
        auth: { user: email, pass: password }
      };
    } else if (service === 'outlook') {
      transporterConfig = {
        service: 'hotmail',
        auth: { user: email, pass: password }
      };
    } else {
      transporterConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: email, pass: password }
      };
    }

    const transporter = nodemailer.createTransporter(transporterConfig);
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Email configuration is valid!');
    
    // Send test email
    const testEmail = {
      from: email,
      to: email, // Send to self for testing
      subject: 'TIC GLOBAL Email Test - Password Reset System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #14c3cb;">🎉 Email Configuration Successful!</h2>
          <p>This is a test email from your TIC GLOBAL password reset system.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>Email: ${email}</li>
            <li>Service: ${service}</li>
            <li>Status: ✅ Working</li>
          </ul>
          <p>Your forgot password functionality is now ready for ALL users!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            TIC GLOBAL Ltd. - Password Reset System Test
          </p>
        </div>
      `
    };

    await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Check your inbox for the test email');
    
    return true;
  } catch (error) {
    console.log('❌ Email configuration failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('💡 Authentication failed. Common solutions:');
      console.log('   - For Gmail: Use App Password, not regular password');
      console.log('   - Enable 2-Factor Authentication first');
      console.log('   - Generate App Password in Google Account settings');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Cannot connect to email server');
      console.log('   - Check your internet connection');
      console.log('   - Verify email provider settings');
    }
    
    return false;
  }
}

async function setupEmail() {
  console.log('\n🚀 TIC GLOBAL Email Setup for ALL Users');
  console.log('==========================================\n');

  console.log('This wizard will configure email delivery for the forgot password feature.');
  console.log('Once configured, ALL users will receive actual emails with reset links.\n');

  console.log('Choose your email provider:');
  console.log('1. Gmail (Recommended)');
  console.log('2. Outlook/Hotmail');
  console.log('3. Other/Custom SMTP');
  console.log('4. Skip email setup (console logging only)\n');

  const choice = await question('Enter your choice (1-4): ');

  let email = '';
  let password = '';
  let service = 'gmail';

  switch (choice) {
    case '1':
      console.log('\n📧 Gmail Setup');
      console.log('===============');
      console.log('Requirements:');
      console.log('1. Gmail account');
      console.log('2. 2-Factor Authentication enabled');
      console.log('3. App Password generated\n');
      
      console.log('📝 How to get Gmail App Password:');
      console.log('1. Go to https://myaccount.google.com/security');
      console.log('2. Enable 2-Step Verification');
      console.log('3. Go to App passwords');
      console.log('4. Generate password for "Mail"');
      console.log('5. Use the 16-character password below\n');

      email = await question('Enter your Gmail address: ');
      password = await question('Enter your Gmail App Password: ');
      service = 'gmail';
      break;

    case '2':
      console.log('\n📧 Outlook/Hotmail Setup');
      console.log('=========================');
      email = await question('Enter your Outlook/Hotmail address: ');
      password = await question('Enter your password: ');
      service = 'outlook';
      break;

    case '3':
      console.log('\n📧 Custom SMTP Setup');
      console.log('=====================');
      email = await question('Enter your email address: ');
      password = await question('Enter your password: ');
      service = 'custom';
      break;

    case '4':
      console.log('\n⏭️  Skipping email setup');
      console.log('Reset links will be logged to console only.');
      rl.close();
      return;

    default:
      console.log('Invalid choice. Exiting...');
      rl.close();
      return;
  }

  // Test the configuration
  const isWorking = await testEmailConfiguration(email, password, service);

  if (!isWorking) {
    console.log('\n❌ Email configuration failed. Please try again.');
    rl.close();
    return;
  }

  // Update .env.local file
  const envPath = path.join(__dirname, '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Remove existing SMTP configuration
  envContent = envContent.replace(/\n# Email Configuration.*?\nSMTP_PASSWORD=.*$/ms, '');
  
  // Add new SMTP configuration
  const smtpConfig = `
# Email Configuration (SMTP) - Working for ALL Users
SMTP_EMAIL=${email}
SMTP_PASSWORD=${password}`;

  envContent += smtpConfig;

  // Write back to .env.local
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Email configuration saved successfully!');
  console.log('\n🎉 FORGOT PASSWORD NOW WORKS FOR ALL USERS!');
  console.log('\n🔄 Next steps:');
  console.log('1. Restart your development server (npm run dev)');
  console.log('2. Test forgot password with any user email');
  console.log('3. Users will receive actual emails with reset links');
  console.log('4. No more console-only reset URLs!');

  console.log('\n📧 Email Features Now Active:');
  console.log('✅ Professional HTML email templates');
  console.log('✅ Automatic email delivery to ALL users');
  console.log('✅ Branded TIC GLOBAL design');
  console.log('✅ Security instructions and warnings');
  console.log('✅ 24-hour expiry notifications');

  rl.close();
}

// Run the setup
setupEmail().catch(console.error);
