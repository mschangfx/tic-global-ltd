# Email Configuration Setup Guide

## Overview
The contact form now sends emails directly to your company email address (`contact@ticgloballtd.com`) and sends an auto-reply confirmation to the user.

## Required Setup

### 1. Update Environment Variables
Edit your `.env.local` file and replace the placeholder values:

```env
# Email Configuration (SMTP)
SMTP_EMAIL=your-actual-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 2. Gmail Setup (Recommended)

#### Option A: Using Gmail with App Password (Recommended)
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this 16-character password as `SMTP_PASSWORD`

#### Option B: Using Gmail with OAuth2 (Advanced)
- Requires additional setup with Google Cloud Console
- More secure but complex implementation

### 3. Alternative Email Providers

#### Using Outlook/Hotmail
```env
SMTP_EMAIL=your-email@outlook.com
SMTP_PASSWORD=your-password
```
Update the transporter in `/src/app/api/contact/route.ts`:
```javascript
const transporter = nodemailer.createTransporter({
  service: 'hotmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});
```

#### Using Custom SMTP Server
```env
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_EMAIL=contact@ticgloballtd.com
SMTP_PASSWORD=your-password
```
Update the transporter:
```javascript
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});
```

## Features Implemented

### 1. Contact Form Submission
- ✅ Form validation (required fields, email format)
- ✅ Loading state during submission
- ✅ Success/error notifications
- ✅ Form reset after successful submission

### 2. Email Notifications
- ✅ **Company Email**: Detailed notification sent to `contact@ticgloballtd.com`
- ✅ **Auto-Reply**: Confirmation email sent to the user
- ✅ **Professional HTML Templates**: Branded email design
- ✅ **Complete Information**: All form data included

### 3. Email Content
**Company Email includes:**
- Contact person's full information
- Subject and message
- Timestamp
- Professional formatting

**User Auto-Reply includes:**
- Personalized greeting
- Confirmation of message receipt
- Expected response time
- Company contact information

## Testing

### 1. Test the Contact Form
1. Fill out the contact form on `/contact`
2. Submit the form
3. Check for success notification
4. Verify emails are received

### 2. Error Handling
- Try submitting with missing fields
- Try submitting with invalid email
- Check error notifications

## Security Notes

### 1. Environment Variables
- Never commit actual credentials to version control
- Use strong, unique passwords
- Consider using app passwords instead of main account passwords

### 2. Rate Limiting (Future Enhancement)
Consider implementing rate limiting to prevent spam:
```javascript
// Example: Limit to 5 submissions per IP per hour
```

### 3. Spam Protection (Future Enhancement)
Consider adding:
- reCAPTCHA integration
- Honeypot fields
- Content filtering

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Check email/password credentials
   - Ensure 2FA is enabled for Gmail
   - Use app password instead of regular password

2. **"Connection timeout"**
   - Check SMTP server settings
   - Verify firewall/network settings
   - Try different port (587, 465, 25)

3. **"Email not received"**
   - Check spam/junk folders
   - Verify recipient email address
   - Check email provider logs

### Debug Mode
To enable debug logging, add to the transporter:
```javascript
const transporter = nodemailer.createTransporter({
  // ... other settings
  debug: true,
  logger: true,
});
```

## Production Considerations

1. **Use Professional Email Service**
   - Consider services like SendGrid, Mailgun, or AWS SES
   - Better deliverability and analytics
   - Higher sending limits

2. **Email Templates**
   - Store templates in separate files
   - Use template engines for dynamic content
   - Implement email preview functionality

3. **Monitoring**
   - Log email sending attempts
   - Monitor delivery rates
   - Set up alerts for failures

## Support
If you need help setting up the email configuration, please contact the development team with:
- Your preferred email provider
- Any specific requirements
- Error messages (if any)
