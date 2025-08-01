#!/usr/bin/env node

/**
 * Quick fix for email configuration
 * This will update your .env.local with working email settings
 */

const fs = require('fs');
const path = require('path');

const fixEmailConfig = () => {
  console.log('🔧 Fixing Email Configuration for ALL Users');
  console.log('============================================\n');

  const envPath = path.join(__dirname, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found!');
    return;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('📋 Current email configuration:');
  const currentEmail = envContent.match(/SMTP_EMAIL=(.+)/)?.[1] || '[NOT SET]';
  const currentPassword = envContent.match(/SMTP_PASSWORD=(.+)/)?.[1] || '[NOT SET]';
  
  console.log('SMTP_EMAIL:', currentEmail);
  console.log('SMTP_PASSWORD:', currentPassword.length > 0 ? '[SET - ' + currentPassword.length + ' chars]' : '[NOT SET]');
  console.log('');

  // Check if current config is placeholder
  if (currentEmail === 'contact@gmail.com' || currentEmail === 'your-email@gmail.com') {
    console.log('❌ Current email configuration uses placeholder values');
    console.log('💡 You need to set up real email credentials\n');
    
    console.log('🔧 Options to fix this:');
    console.log('');
    console.log('Option 1: Use Your Gmail Account');
    console.log('1. Enable 2-Factor Authentication on your Gmail');
    console.log('2. Generate App Password at: https://myaccount.google.com/apppasswords');
    console.log('3. Update .env.local with your real Gmail and App Password');
    console.log('');
    console.log('Option 2: Use mschangfx@gmail.com (if you have access)');
    console.log('1. Get the App Password for mschangfx@gmail.com');
    console.log('2. Update .env.local with the correct credentials');
    console.log('');
    console.log('Option 3: Use Different Email Provider');
    console.log('1. Use Outlook/Hotmail with regular password');
    console.log('2. Or use any other SMTP service');
    console.log('');

    // Provide template for manual update
    console.log('📝 Manual Update Template:');
    console.log('Edit your .env.local file and replace the email section with:');
    console.log('');
    console.log('# Email Configuration (SMTP) - Working for ALL Users');
    console.log('SMTP_EMAIL=your-real-email@gmail.com');
    console.log('SMTP_PASSWORD=your-16-char-app-password');
    console.log('');
    
    // Create a backup configuration
    const backupConfig = `
# Email Configuration (SMTP) - NEEDS REAL CREDENTIALS
# Replace these with your actual email credentials:
# For Gmail: Use App Password (16 characters)
# For Outlook: Use regular password
SMTP_EMAIL=your-real-email@gmail.com
SMTP_PASSWORD=your-app-password-here`;

    // Remove existing SMTP configuration
    envContent = envContent.replace(/\n# Email Configuration.*?\nSMTP_PASSWORD=.*$/ms, '');
    
    // Add new template
    envContent += backupConfig;
    
    // Write back to file
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Updated .env.local with template');
    console.log('📝 Please edit .env.local and add your real email credentials');
    
  } else {
    console.log('✅ Email configuration appears to be set');
    console.log('🧪 Test the configuration with: node test-email-direct.js');
  }

  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. Update .env.local with real email credentials');
  console.log('2. Restart your development server: npm run dev');
  console.log('3. Test forgot password: http://localhost:8000/forgot-password');
  console.log('4. Check email inbox for reset links');
  console.log('');
  console.log('📧 Once configured, ALL users will receive actual emails!');
};

fixEmailConfig();
