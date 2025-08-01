#!/usr/bin/env node

/**
 * Help find correct SMTP settings for TIC GLOBAL email
 */

const dns = require('dns');
const { promisify } = require('util');

const resolveMx = promisify(dns.resolveMx);

const findSmtpSettings = async () => {
  console.log('🔍 Finding SMTP Settings for TIC GLOBAL Email');
  console.log('==============================================\n');

  const domain = 'ticgloballtd.com';
  console.log('🌐 Domain:', domain);

  try {
    // Check MX records
    console.log('📧 Checking MX records...');
    const mxRecords = await resolveMx(domain);
    
    if (mxRecords && mxRecords.length > 0) {
      console.log('✅ MX Records found:');
      mxRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.exchange} (priority: ${record.priority})`);
      });

      // Suggest SMTP settings based on MX records
      const primaryMx = mxRecords[0].exchange;
      console.log('\n🔧 Suggested SMTP Settings:');
      
      if (primaryMx.includes('google') || primaryMx.includes('gmail')) {
        console.log('📧 Google Workspace detected');
        console.log('SMTP_HOST=smtp.gmail.com');
        console.log('SMTP_PORT=587');
        console.log('SMTP_SECURE=false');
        console.log('💡 Use your Google Workspace credentials');
      } else if (primaryMx.includes('outlook') || primaryMx.includes('microsoft')) {
        console.log('📧 Microsoft 365/Outlook detected');
        console.log('SMTP_HOST=smtp.office365.com');
        console.log('SMTP_PORT=587');
        console.log('SMTP_SECURE=false');
        console.log('💡 Use your Microsoft 365 credentials');
      } else if (primaryMx.includes('mail.') || primaryMx.includes('smtp.')) {
        console.log('📧 Custom mail server detected');
        console.log(`SMTP_HOST=${primaryMx}`);
        console.log('SMTP_PORT=587');
        console.log('SMTP_SECURE=false');
        console.log('💡 Try the primary MX record as SMTP host');
      } else {
        console.log('📧 Custom email provider');
        console.log('💡 Common SMTP settings to try:');
        console.log(`   SMTP_HOST=mail.${domain}`);
        console.log(`   SMTP_HOST=smtp.${domain}`);
        console.log(`   SMTP_HOST=${primaryMx}`);
        console.log('   SMTP_PORT=587 or 465');
      }

    } else {
      console.log('❌ No MX records found');
      console.log('💡 Domain might not have email configured');
    }

  } catch (error) {
    console.log('❌ Error checking MX records:', error.message);
    console.log('💡 Domain might not exist or have email configured');
  }

  console.log('\n🔧 Common SMTP Settings to Try:');
  console.log('================================');
  
  console.log('\n1. Google Workspace (if using Google for email):');
  console.log('   SMTP_HOST=smtp.gmail.com');
  console.log('   SMTP_PORT=587');
  console.log('   SMTP_SECURE=false');
  
  console.log('\n2. Microsoft 365/Outlook:');
  console.log('   SMTP_HOST=smtp.office365.com');
  console.log('   SMTP_PORT=587');
  console.log('   SMTP_SECURE=false');
  
  console.log('\n3. Custom hosting provider:');
  console.log('   SMTP_HOST=mail.ticgloballtd.com');
  console.log('   SMTP_PORT=587');
  console.log('   SMTP_SECURE=false');
  
  console.log('\n4. Alternative custom settings:');
  console.log('   SMTP_HOST=smtp.ticgloballtd.com');
  console.log('   SMTP_PORT=465');
  console.log('   SMTP_SECURE=true');

  console.log('\n💡 How to find your correct SMTP settings:');
  console.log('1. Check your email client settings (Outlook, Thunderbird, etc.)');
  console.log('2. Contact your email hosting provider');
  console.log('3. Check your domain registrar\'s email documentation');
  console.log('4. Look for email setup guides from your hosting company');

  console.log('\n🧪 Test each configuration:');
  console.log('1. Update .env.local with the settings');
  console.log('2. Restart your development server');
  console.log('3. Test forgot password functionality');
  console.log('4. Check server console for connection errors');

  console.log('\n📧 Current .env.local should look like:');
  console.log('SMTP_HOST=your-smtp-server');
  console.log('SMTP_PORT=587');
  console.log('SMTP_SECURE=false');
  console.log('SMTP_EMAIL=contact@ticgloballtd.com');
  console.log('SMTP_PASSWORD=contact1223!');
};

findSmtpSettings();
