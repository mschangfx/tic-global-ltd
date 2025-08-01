#!/usr/bin/env node

/**
 * Quick Email Setup Script for TIC GLOBAL Contact Form
 * 
 * This script helps you quickly set up email configuration
 * for the contact form functionality.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEmail() {
  console.log('\n🚀 TIC GLOBAL Email Setup Wizard');
  console.log('=====================================\n');

  console.log('This wizard will help you configure email for the contact form.');
  console.log('You have several options:\n');
  
  console.log('1. Gmail (Recommended - Easy setup)');
  console.log('2. Outlook/Hotmail');
  console.log('3. Custom SMTP Server');
  console.log('4. Skip email setup (forms will be logged only)\n');

  const choice = await question('Choose an option (1-4): ');

  let smtpEmail = '';
  let smtpPassword = '';
  let additionalConfig = '';

  switch (choice) {
    case '1':
      console.log('\n📧 Gmail Setup');
      console.log('===============');
      console.log('To use Gmail, you need:');
      console.log('1. A Gmail account');
      console.log('2. 2-Factor Authentication enabled');
      console.log('3. An App Password generated\n');
      
      console.log('📝 How to get Gmail App Password:');
      console.log('1. Go to https://myaccount.google.com/security');
      console.log('2. Enable 2-Step Verification');
      console.log('3. Go to App passwords');
      console.log('4. Generate password for "Mail"');
      console.log('5. Use the 16-character password below\n');

      smtpEmail = await question('Enter your Gmail address: ');
      smtpPassword = await question('Enter your Gmail App Password: ');
      break;

    case '2':
      console.log('\n📧 Outlook/Hotmail Setup');
      console.log('=========================');
      smtpEmail = await question('Enter your Outlook/Hotmail address: ');
      smtpPassword = await question('Enter your password: ');
      additionalConfig = '\n# Note: Using Outlook/Hotmail SMTP';
      break;

    case '3':
      console.log('\n📧 Custom SMTP Setup');
      console.log('=====================');
      const smtpHost = await question('Enter SMTP host (e.g., smtp.yourdomain.com): ');
      const smtpPort = await question('Enter SMTP port (usually 587): ');
      smtpEmail = await question('Enter SMTP username/email: ');
      smtpPassword = await question('Enter SMTP password: ');
      
      additionalConfig = `
# Custom SMTP Configuration
SMTP_HOST=${smtpHost}
SMTP_PORT=${smtpPort}`;
      break;

    case '4':
      console.log('\n⏭️  Skipping email setup');
      console.log('Contact forms will be logged to console and files only.');
      smtpEmail = 'your-email@gmail.com';
      smtpPassword = 'your-app-password';
      additionalConfig = '\n# Email setup skipped - forms will be logged only';
      break;

    default:
      console.log('Invalid choice. Exiting...');
      rl.close();
      return;
  }

  // Read current .env.local file
  const envPath = path.join(__dirname, '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add SMTP configuration
  const smtpConfig = `
# Email Configuration (SMTP)${additionalConfig}
SMTP_EMAIL=${smtpEmail}
SMTP_PASSWORD=${smtpPassword}`;

  // Remove existing SMTP configuration if present
  envContent = envContent.replace(/\n# Email Configuration.*?\nSMTP_PASSWORD=.*$/ms, '');
  
  // Add new SMTP configuration
  envContent += smtpConfig;

  // Write back to .env.local
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Email configuration saved to .env.local');
  
  if (choice !== '4') {
    console.log('\n🔄 Next steps:');
    console.log('1. Restart your development server (npm run dev)');
    console.log('2. Test the contact form');
    console.log('3. Check your email for test messages\n');
  } else {
    console.log('\n📝 Contact form submissions will be logged to:');
    console.log('- Console output (check your terminal)');
    console.log('- Files in ./contact-submissions/ directory\n');
  }

  console.log('🎉 Setup complete!');
  rl.close();
}

// Run the setup
setupEmail().catch(console.error);
