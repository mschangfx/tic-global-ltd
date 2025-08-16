const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; // Get from @BotFather
const ADMIN_TELEGRAM_ID = 'YOUR_ADMIN_TELEGRAM_ID'; // Your Telegram user ID
const SUPABASE_URL = 'https://clsowgswufspftizyjlc.supabase.co';
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_KEY'; // Service role key

// Initialize bot and Supabase
const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Store processed transactions to avoid duplicates
const processedTransactions = new Set();

console.log('🤖 TIC Global Admin Bot Starting...');

// Bot commands
bot.command('start', (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_TELEGRAM_ID) {
    return ctx.reply('❌ Unauthorized access');
  }
  ctx.reply('✅ TIC Global Admin Bot is running!\n\n📋 Commands:\n/pending - Check pending transactions\n/stats - View statistics');
});

bot.command('pending', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_TELEGRAM_ID) {
    return ctx.reply('❌ Unauthorized access');
  }
  
  try {
    await checkPendingTransactions(ctx);
  } catch (error) {
    console.error('Error checking pending:', error);
    ctx.reply('❌ Error checking pending transactions');
  }
});

bot.command('stats', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_TELEGRAM_ID) {
    return ctx.reply('❌ Unauthorized access');
  }
  
  try {
    const { data: deposits } = await supabase
      .from('deposits')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    const pendingDeposits = deposits?.length || 0;
    const pendingWithdrawals = withdrawals?.length || 0;

    ctx.reply(`📊 **TIC Global Statistics**\n\n💰 Pending Deposits: ${pendingDeposits}\n💸 Pending Withdrawals: ${pendingWithdrawals}\n\nTotal Pending: ${pendingDeposits + pendingWithdrawals}`);
  } catch (error) {
    console.error('Error getting stats:', error);
    ctx.reply('❌ Error getting statistics');
  }
});

// Handle approve/reject button clicks
bot.on('callback_query', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_TELEGRAM_ID) {
    return ctx.answerCbQuery('❌ Unauthorized');
  }

  const data = ctx.callbackQuery.data;
  const [action, type, txnId] = data.split('_');

  try {
    if (action === 'approve') {
      await approveTransaction(type, txnId, ctx);
    } else if (action === 'reject') {
      await rejectTransaction(type, txnId, ctx);
    }
  } catch (error) {
    console.error('Error handling callback:', error);
    ctx.answerCbQuery('❌ Error processing request');
  }
});

// Function to check pending transactions
async function checkPendingTransactions(ctx = null) {
  try {
    // Check pending deposits
    const { data: deposits, error: depositsError } = await supabase
      .from('deposits')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (depositsError) {
      console.error('Deposits error:', depositsError);
    }

    // Check pending withdrawals
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (withdrawalsError) {
      console.error('Withdrawals error:', withdrawalsError);
    }

    // Send notifications for new deposits
    if (deposits && deposits.length > 0) {
      for (const deposit of deposits) {
        if (!processedTransactions.has(`deposit_${deposit.id}`)) {
          await sendDepositNotification(deposit);
          processedTransactions.add(`deposit_${deposit.id}`);
        }
      }
    }

    // Send notifications for new withdrawals
    if (withdrawals && withdrawals.length > 0) {
      for (const withdrawal of withdrawals) {
        if (!processedTransactions.has(`withdrawal_${withdrawal.id}`)) {
          await sendWithdrawalNotification(withdrawal);
          processedTransactions.add(`withdrawal_${withdrawal.id}`);
        }
      }
    }

    // If called manually, send summary
    if (ctx) {
      const totalPending = (deposits?.length || 0) + (withdrawals?.length || 0);
      if (totalPending === 0) {
        ctx.reply('✅ No pending transactions');
      } else {
        ctx.reply(`📋 Found ${totalPending} pending transactions\n💰 Deposits: ${deposits?.length || 0}\n💸 Withdrawals: ${withdrawals?.length || 0}`);
      }
    }

  } catch (error) {
    console.error('Error checking pending transactions:', error);
    if (ctx) ctx.reply('❌ Error checking transactions');
  }
}

// Send deposit notification
async function sendDepositNotification(deposit) {
  const message = `🧾 **DEPOSIT REQUEST**\n\n👤 User: ${deposit.user_email}\n💰 Amount: $${deposit.amount} ${deposit.currency}\n🌐 Network: ${deposit.network}\n📅 Time: ${new Date(deposit.created_at).toLocaleString()}\n🆔 ID: ${deposit.id.substring(0, 8)}...`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve_deposit_${deposit.id}` },
        { text: '❌ Reject', callback_data: `reject_deposit_${deposit.id}` }
      ]
    ]
  };

  try {
    await bot.telegram.sendMessage(ADMIN_TELEGRAM_ID, message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Error sending deposit notification:', error);
  }
}

// Send withdrawal notification
async function sendWithdrawalNotification(withdrawal) {
  const finalAmount = withdrawal.final_amount || withdrawal.amount;
  const processingFee = withdrawal.processing_fee || 0;
  const message = `💸 **WITHDRAWAL REQUEST**\n\n👤 User: ${withdrawal.user_email}\n💰 Send: $${finalAmount} ${withdrawal.currency}\n📊 Original: $${withdrawal.amount} - Fee: $${processingFee.toFixed(2)}\n🏦 To: ${withdrawal.destination_address.substring(0, 20)}...\n🌐 Network: ${withdrawal.network || 'N/A'}\n📅 Time: ${new Date(withdrawal.created_at).toLocaleString()}\n🆔 ID: ${withdrawal.id.substring(0, 8)}...`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve_withdrawal_${withdrawal.id}` },
        { text: '❌ Reject', callback_data: `reject_withdrawal_${withdrawal.id}` }
      ]
    ]
  };

  try {
    await bot.telegram.sendMessage(ADMIN_TELEGRAM_ID, message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Error sending withdrawal notification:', error);
  }
}

// Approve transaction
async function approveTransaction(type, txnId, ctx) {
  const timestamp = new Date().toISOString();
  const adminEmail = 'admin@ticgloballtd.com'; // Your admin email

  try {
    if (type === 'deposit') {
      const { data, error } = await supabase
        .from('deposits')
        .update({
          status: 'approved',
          admin_notes: `Approved via Telegram bot at ${timestamp}`,
          approved_by: adminEmail,
          approved_at: timestamp,
          updated_at: timestamp
        })
        .eq('id', txnId)
        .select()
        .single();

      if (error) throw error;

      ctx.answerCbQuery('✅ Deposit approved!');
      ctx.reply(`✅ **DEPOSIT APPROVED**\n\n👤 User: ${data.user_email}\n💰 Amount: $${data.amount}\n⏰ Approved at: ${new Date().toLocaleString()}`);

    } else if (type === 'withdrawal') {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          admin_notes: `Approved via Telegram bot at ${timestamp}`,
          processed_by: adminEmail,
          processed_at: timestamp
        })
        .eq('id', txnId)
        .select()
        .single();

      if (error) throw error;

      ctx.answerCbQuery('✅ Withdrawal approved!');
      ctx.reply(`✅ **WITHDRAWAL APPROVED**\n\n👤 User: ${data.user_email}\n💰 Amount: $${data.amount}\n⏰ Approved at: ${new Date().toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error approving transaction:', error);
    ctx.answerCbQuery('❌ Error approving transaction');
    ctx.reply(`❌ Error approving ${type}: ${error.message}`);
  }
}

// Reject transaction
async function rejectTransaction(type, txnId, ctx) {
  const timestamp = new Date().toISOString();
  const adminEmail = 'admin@ticgloballtd.com';

  try {
    if (type === 'deposit') {
      const { data, error } = await supabase
        .from('deposits')
        .update({
          status: 'rejected',
          admin_notes: `Rejected via Telegram bot at ${timestamp}`,
          rejected_by: adminEmail,
          rejected_at: timestamp,
          updated_at: timestamp
        })
        .eq('id', txnId)
        .select()
        .single();

      if (error) throw error;

      ctx.answerCbQuery('❌ Deposit rejected');
      ctx.reply(`❌ **DEPOSIT REJECTED**\n\n👤 User: ${data.user_email}\n💰 Amount: $${data.amount}\n⏰ Rejected at: ${new Date().toLocaleString()}`);

    } else if (type === 'withdrawal') {
      // First get withdrawal details
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', txnId)
        .single();

      if (fetchError || !withdrawal) {
        throw new Error('Withdrawal not found');
      }

      // Update withdrawal status
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          admin_notes: `Rejected via Telegram bot at ${timestamp}`,
          processed_by: adminEmail,
          processed_at: timestamp
        })
        .eq('id', txnId);

      if (error) throw error;

      // Refund the amount to user's wallet using the proper function with unique transaction ID
      const refundTransactionId = `refund-${txnId}-${Date.now()}`;
      const { error: refundError } = await supabase
        .rpc('credit_user_wallet', {
          user_email_param: withdrawal.user_email,
          amount_param: withdrawal.amount,
          transaction_id_param: refundTransactionId,
          description_param: `Withdrawal rejection refund: $${withdrawal.amount}`
        });

      if (refundError) {
        console.error('Error refunding withdrawal:', refundError);
        // Still report success but mention refund issue
        ctx.answerCbQuery('❌ Withdrawal rejected (refund failed)');
        ctx.reply(`❌ **WITHDRAWAL REJECTED**\n\n👤 User: ${withdrawal.user_email}\n💰 Amount: $${withdrawal.amount}\n⏰ Rejected at: ${new Date().toLocaleString()}\n\n⚠️ **Warning**: Refund failed - manual intervention required`);
      } else {
        ctx.answerCbQuery('❌ Withdrawal rejected');
        ctx.reply(`❌ **WITHDRAWAL REJECTED**\n\n👤 User: ${withdrawal.user_email}\n💰 Amount: $${withdrawal.amount}\n⏰ Rejected at: ${new Date().toLocaleString()}\n💰 **Refunded**: $${withdrawal.amount} has been returned to user's wallet`);
      }
    }

  } catch (error) {
    console.error('Error rejecting transaction:', error);
    ctx.answerCbQuery('❌ Error rejecting transaction');
    ctx.reply(`❌ Error rejecting ${type}: ${error.message}`);
  }
}

// Auto-check for new transactions every 30 seconds
setInterval(async () => {
  await checkPendingTransactions();
}, 30000);

// Start the bot
bot.launch().then(() => {
  console.log('✅ TIC Global Admin Bot is running!');
  console.log(`📱 Admin ID: ${ADMIN_TELEGRAM_ID}`);
  console.log('🔄 Checking for pending transactions every 30 seconds...');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
