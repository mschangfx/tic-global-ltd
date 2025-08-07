# 🤖 TIC Global Admin Telegram Bot Setup

## 🎯 Overview
This Telegram bot allows you to approve/reject deposit and withdrawal requests directly from Telegram with simple button clicks. No need to login to Supabase or use web interfaces.

## 🚀 Two Deployment Options

### Option A: Vercel Integration (Recommended)
- ✅ **Integrated with your website** - No separate server needed
- ✅ **Automatic notifications** - Instant alerts when users submit requests
- ✅ **Zero maintenance** - Runs on Vercel alongside your site
- ✅ **Easy setup** - Just add environment variables

### Option B: Standalone Node.js Bot
- ✅ **Independent server** - Runs separately from your website
- ✅ **Polling-based** - Checks database every 30 seconds
- ✅ **Full control** - Can customize polling intervals and behavior

## 📋 Features
- ✅ **Instant notifications** for new deposit/withdrawal requests
- ✅ **One-click approval/rejection** with inline buttons
- ✅ **Real-time monitoring** (checks every 30 seconds)
- ✅ **Secure access** (only your Telegram ID can use it)
- ✅ **Complete transaction details** in notifications
- ✅ **Statistics and manual checks** with commands

## 🛠️ Step 1: Create Telegram Bot

### 1.1 Create Bot with BotFather
1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Choose a name: `TIC Global Admin Bot`
4. Choose a username: `tic_global_admin_bot` (must end with 'bot')
5. **Save the bot token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 1.2 Get Your Telegram User ID
1. Search for `@userinfobot` in Telegram
2. Send `/start`
3. **Save your user ID** (looks like: `123456789`)

---

# 🚀 OPTION A: Vercel Integration (Recommended)

## 🛠️ Step 2A: Setup Vercel Environment Variables

### 2A.1 Add Environment Variables to Vercel
Go to your Vercel project settings and add these environment variables:

```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
ADMIN_TELEGRAM_ID=123456789
TELEGRAM_WEBHOOK_SECRET=your-secret-key-2024
NOTIFICATION_SECRET=notify-secret-2024
```

### 2A.2 Set Telegram Webhook
After deploying, set your webhook URL:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.vercel.app/api/telegram-webhook",
    "secret_token": "your-secret-key-2024"
  }'
```

## 🎯 Step 3A: Test Vercel Integration

### 3A.1 Test Bot Commands
1. Find your bot in Telegram: `@tic_global_admin_bot`
2. Send `/start` - Should respond with welcome message
3. Send `/pending` - Should check for pending transactions
4. Send `/stats` - Should show statistics

### 3A.2 Test Automatic Notifications
1. Create a test deposit/withdrawal from your website
2. Add this code to your deposit/withdrawal creation:

```javascript
// After creating deposit/withdrawal, notify admin
await fetch('/api/notify-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret: 'notify-secret-2024',
    type: 'deposit', // or 'withdrawal'
    transactionId: newTransaction.id
  })
});
```

3. You should receive instant Telegram notification with approve/reject buttons

### 3A.3 Manual Notification Check
Visit this URL to manually check for pending transactions:
```
https://your-domain.vercel.app/api/notify-admin?secret=notify-secret-2024
```

---

# 🖥️ OPTION B: Standalone Node.js Bot

## 🛠️ Step 2: Setup Bot Files

### 2.1 Create Bot Directory
```bash
mkdir tic-admin-bot
cd tic-admin-bot
```

### 2.2 Copy Files
Copy these files to your bot directory:
- `telegram-admin-bot.js` (main bot code)
- `telegram-bot-package.json` (rename to `package.json`)

### 2.3 Install Dependencies
```bash
npm install
```

## 🛠️ Step 3: Configure Bot

### 3.1 Edit telegram-admin-bot.js
Replace these values in the file:

```javascript
const BOT_TOKEN = 'YOUR_BOT_TOKEN_FROM_BOTFATHER';
const ADMIN_TELEGRAM_ID = 'YOUR_TELEGRAM_USER_ID';
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_KEY';
```

### 3.2 Get Supabase Service Key
1. Go to your Supabase project: https://supabase.com/dashboard/project/clsowgswufspftizyjlc
2. Go to **Settings** → **API**
3. Copy the **service_role** key (not the anon key)
4. **⚠️ Keep this secret!** This key has full database access

## 🛠️ Step 4: Run the Bot

### Option A: Simple Run (for testing)
```bash
npm start
```

### Option B: Development Mode (auto-restart)
```bash
npm run dev
```

### Option C: Production Mode (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Start bot with PM2
npm run pm2

# Check status
pm2 status

# View logs
pm2 logs tic-admin-bot

# Stop bot
pm2 stop tic-admin-bot
```

## 🎯 Step 5: Test the Bot

### 5.1 Start Bot
1. Find your bot in Telegram: `@tic_global_admin_bot`
2. Send `/start`
3. You should see: "✅ TIC Global Admin Bot is running!"

### 5.2 Test Commands
- `/pending` - Check current pending transactions
- `/stats` - View statistics

### 5.3 Test Approval Flow
1. Create a test deposit/withdrawal from your website
2. Bot should send you a notification with buttons
3. Click ✅ Approve or ❌ Reject
4. Check Supabase to confirm status changed

## 📱 How It Works

### Automatic Notifications
When a user submits a deposit/withdrawal request:

**Deposit Notification:**
```
🧾 DEPOSIT REQUEST

👤 User: user@example.com
💰 Amount: $500 USD
🌐 Network: TRC20
📅 Time: 2025-08-07 14:30:15
🆔 ID: abc12345...

[✅ Approve] [❌ Reject]
```

**Withdrawal Notification:**
```
💸 WITHDRAWAL REQUEST

👤 User: user@example.com
💰 Amount: $750 USD
🏦 To: TXn4Vqo8kneB159...
🌐 Network: TRC20
📅 Time: 2025-08-07 14:35:22
🆔 ID: def67890...

[✅ Approve] [❌ Reject]
```

### One-Click Actions
- **✅ Approve**: Updates status to 'approved' in database
- **❌ Reject**: Updates status to 'rejected' in database
- **Confirmation**: Bot sends confirmation message with details

## 🔧 Customization Options

### Change Check Interval
Edit this line to change how often bot checks for new transactions:
```javascript
// Check every 30 seconds (30000 ms)
setInterval(async () => {
  await checkPendingTransactions();
}, 30000);
```

### Add Multiple Admins
Replace single admin ID with array:
```javascript
const ADMIN_TELEGRAM_IDS = ['123456789', '987654321'];

// Then check if user is admin:
if (!ADMIN_TELEGRAM_IDS.includes(ctx.from.id.toString())) {
  return ctx.reply('❌ Unauthorized access');
}
```

### Custom Messages
Edit the notification messages in `sendDepositNotification()` and `sendWithdrawalNotification()` functions.

## 🚨 Security Notes

1. **Keep bot token secret** - Never share or commit to public repos
2. **Keep service key secret** - This has full database access
3. **Verify admin ID** - Only your Telegram ID can use the bot
4. **Use HTTPS** - Bot communicates securely with Telegram
5. **Monitor logs** - Check for any unauthorized access attempts

## 🐛 Troubleshooting

### Bot doesn't respond
- Check bot token is correct
- Verify bot is running (`pm2 status`)
- Check logs (`pm2 logs tic-admin-bot`)

### No notifications received
- Verify Supabase connection
- Check service key permissions
- Ensure transactions exist in database
- Check bot logs for errors

### Buttons don't work
- Verify admin Telegram ID is correct
- Check callback query handling in logs
- Ensure database update permissions

### Database errors
- Verify service key has proper permissions
- Check table names match your schema
- Ensure RLS policies allow service key access

## 📊 Monitoring

### View Bot Status
```bash
pm2 status
pm2 logs tic-admin-bot --lines 50
```

### Database Queries
Check recent transactions:
```sql
SELECT * FROM deposits WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10;
SELECT * FROM withdrawal_requests WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10;
```

## 🎉 Benefits

✅ **Instant notifications** - Know immediately when requests come in
✅ **Mobile-friendly** - Approve from anywhere using Telegram
✅ **One-click actions** - No complex interfaces or logins
✅ **Audit trail** - All actions logged with timestamps
✅ **Secure** - Only authorized admin can use
✅ **Reliable** - Runs 24/7 with PM2
✅ **Scalable** - Easy to add more admins or features

Your admin workflow is now as simple as:
1. 📱 Receive Telegram notification
2. 👆 Click ✅ Approve or ❌ Reject
3. ✅ Done! User gets their funds/rejection

No more logging into Supabase or complex admin panels!
