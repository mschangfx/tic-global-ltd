# Twilio SMS Setup Guide

This guide will help you set up Twilio for SMS verification in your TIC GLOBAL application.

## 🚀 Quick Setup

### 1. Create Twilio Account

1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up for a free account
3. Verify your email and phone number

### 2. Get Your Credentials

After creating your account, you'll need these 3 values:

1. **Account SID** - Found on your Twilio Console Dashboard
2. **Auth Token** - Found on your Twilio Console Dashboard (click "Show" to reveal)
3. **Phone Number** - You'll need to get a Twilio phone number

### 3. Get a Twilio Phone Number

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose your country (Philippines recommended for Asian users)
3. Select a number with **SMS** capability
4. Purchase the number (costs around $1/month)

### 4. Update Environment Variables

Update your `.env.local` file with your Twilio credentials:

```env
# Twilio Configuration for SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Replace with your actual values:**
- `TWILIO_ACCOUNT_SID`: Your Account SID from Twilio Console
- `TWILIO_AUTH_TOKEN`: Your Auth Token from Twilio Console  
- `TWILIO_PHONE_NUMBER`: Your purchased Twilio phone number (with + and country code)

### 5. Test the Setup

1. Restart your development server: `npm run dev`
2. Go to `http://localhost:8000/dashboard`
3. Try the phone verification process
4. You should receive actual SMS messages!

## 💰 Pricing

### Free Trial
- **$15.50 credit** when you sign up
- Can send SMS to **verified numbers only**
- Perfect for development and testing

### Production Pricing
- **SMS**: ~$0.0075 per message (varies by country)
- **Phone Number**: ~$1.00 per month
- **Very affordable** for most applications

## 🌏 International SMS

Twilio supports SMS to most countries worldwide, including:
- 🇵🇭 Philippines
- 🇸🇬 Singapore  
- 🇲🇾 Malaysia
- 🇹🇭 Thailand
- 🇮🇩 Indonesia
- 🇻🇳 Vietnam
- And many more!

## 🔧 Development vs Production

### Development Mode
- If Twilio is not configured, the system automatically falls back to **development mode**
- Verification codes are shown in the browser toast notifications
- No actual SMS is sent
- Perfect for testing without costs

### Production Mode  
- When Twilio credentials are properly configured, **real SMS** messages are sent
- Users receive verification codes on their actual phone numbers
- Professional SMS delivery with high reliability

## 🛠️ Troubleshooting

### Common Issues

1. **"SMS service not configured"**
   - Check that all 3 environment variables are set correctly
   - Restart your development server after updating `.env.local`

2. **"Permission denied to send SMS"**
   - For trial accounts, you can only send to verified numbers
   - Verify the recipient's phone number in Twilio Console
   - Or upgrade to a paid account for unrestricted sending

3. **"Invalid phone number format"**
   - Ensure phone numbers include country code (e.g., +639123456789)
   - Use international format with + prefix

4. **SMS not received**
   - Check Twilio Console logs for delivery status
   - Verify the phone number is correct
   - Some carriers may block SMS from certain numbers

### Getting Help

- **Twilio Documentation**: https://www.twilio.com/docs/sms
- **Twilio Support**: Available through Twilio Console
- **Phone Number Formatting**: Use international format with country code

## 🔐 Security Best Practices

1. **Never commit** your Twilio credentials to version control
2. **Use environment variables** for all sensitive data
3. **Rotate your Auth Token** periodically
4. **Monitor usage** in Twilio Console to detect unusual activity
5. **Set up billing alerts** to avoid unexpected charges

## 📱 Testing Phone Numbers

For development, you can use these test numbers (won't receive actual SMS):
- `+15005550006` - Valid number for testing
- `+15005550001` - Invalid number for error testing

## 🎯 Next Steps

Once Twilio is configured:
1. ✅ Phone verification will send real SMS messages
2. ✅ Users can verify their phone numbers properly  
3. ✅ Your verification system is production-ready
4. ✅ You can deploy to production with confidence

The system automatically detects if Twilio is configured and switches between development and production modes seamlessly!
