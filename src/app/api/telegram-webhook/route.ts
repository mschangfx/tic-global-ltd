import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration - Add these to your Vercel environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8251984612:AAH4YKXCFnlxQsULco-CNmG3DbekrRY-YmA';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '829590330';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'tic-admin-secret-2024';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Telegram API helper
async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup
    })
  });

  return response.json();
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text
    })
  });
}

// Handle incoming webhook from Telegram
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log incoming webhook for debugging
    console.log('Telegram webhook received:', JSON.stringify(body, null, 2));

    // Optional: Verify webhook secret token if provided
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    if (secretToken && secretToken !== WEBHOOK_SECRET) {
      console.log('Invalid secret token received:', secretToken);
      return NextResponse.json({ error: 'Invalid secret token' }, { status: 401 });
    }

    // Handle different types of updates
    if (body.message) {
      console.log('Processing message:', body.message);
      await handleMessage(body.message);
    } else if (body.callback_query) {
      console.log('Processing callback query:', body.callback_query);
      await handleCallbackQuery(body.callback_query);
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Handle text messages and commands
async function handleMessage(message: any) {
  const chatId = message.chat.id.toString();
  const text = message.text;
  const userId = message.from.id.toString();

  // Check if user is admin
  if (userId !== ADMIN_TELEGRAM_ID) {
    await sendTelegramMessage(chatId, '❌ Unauthorized access');
    return;
  }

  if (text === '/start') {
    await sendTelegramMessage(chatId, '✅ TIC Global Admin Bot is running!\n\n📋 Commands:\n/pending - Check pending transactions\n/stats - View statistics');
  
  } else if (text === '/pending') {
    await handlePendingCommand(chatId);
  
  } else if (text === '/stats') {
    await handleStatsCommand(chatId);
  }
}

// Handle button clicks
async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id.toString();
  const userId = callbackQuery.from.id.toString();
  const data = callbackQuery.data;

  // Check if user is admin
  if (userId !== ADMIN_TELEGRAM_ID) {
    await answerCallbackQuery(callbackQuery.id, '❌ Unauthorized');
    return;
  }

  const [action, type, txnId] = data.split('_');

  try {
    if (action === 'approve') {
      await approveTransaction(type, txnId, chatId, callbackQuery.id);
    } else if (action === 'reject') {
      await rejectTransaction(type, txnId, chatId, callbackQuery.id);
    }
  } catch (error) {
    console.error('Callback error:', error);
    await answerCallbackQuery(callbackQuery.id, '❌ Error processing request');
  }
}

// Handle /pending command
async function handlePendingCommand(chatId: string) {
  try {
    // Get pending deposits
    const { data: deposits } = await supabase
      .from('deposits')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get pending withdrawals
    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    const totalPending = (deposits?.length || 0) + (withdrawals?.length || 0);

    if (totalPending === 0) {
      await sendTelegramMessage(chatId, '✅ No pending transactions');
      return;
    }

    // Send deposit notifications
    if (deposits && deposits.length > 0) {
      for (const deposit of deposits) {
        await sendDepositNotification(chatId, deposit);
      }
    }

    // Send withdrawal notifications
    if (withdrawals && withdrawals.length > 0) {
      for (const withdrawal of withdrawals) {
        await sendWithdrawalNotification(chatId, withdrawal);
      }
    }

    await sendTelegramMessage(chatId, `📋 Found ${totalPending} pending transactions\n💰 Deposits: ${deposits?.length || 0}\n💸 Withdrawals: ${withdrawals?.length || 0}`);

  } catch (error) {
    console.error('Error handling pending:', error);
    await sendTelegramMessage(chatId, '❌ Error checking pending transactions');
  }
}

// Handle /stats command
async function handleStatsCommand(chatId: string) {
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

    await sendTelegramMessage(chatId, `📊 **TIC Global Statistics**\n\n💰 Pending Deposits: ${pendingDeposits}\n💸 Pending Withdrawals: ${pendingWithdrawals}\n\nTotal Pending: ${pendingDeposits + pendingWithdrawals}`);

  } catch (error) {
    console.error('Error getting stats:', error);
    await sendTelegramMessage(chatId, '❌ Error getting statistics');
  }
}

// Send deposit notification
async function sendDepositNotification(chatId: string, deposit: any) {
  const message = `🧾 **DEPOSIT REQUEST**\n\n👤 User: ${deposit.user_email}\n💰 Amount: $${deposit.amount} ${deposit.currency}\n🌐 Network: ${deposit.network}\n📅 Time: ${new Date(deposit.created_at).toLocaleString()}\n🆔 ID: ${deposit.id.substring(0, 8)}...`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve_deposit_${deposit.id}` },
        { text: '❌ Reject', callback_data: `reject_deposit_${deposit.id}` }
      ]
    ]
  };

  await sendTelegramMessage(chatId, message, keyboard);
}

// Send withdrawal notification
async function sendWithdrawalNotification(chatId: string, withdrawal: any) {
  const message = `💸 **WITHDRAWAL REQUEST**\n\n👤 User: ${withdrawal.user_email}\n💰 Amount: $${withdrawal.amount} ${withdrawal.currency}\n🏦 To: ${withdrawal.destination_address.substring(0, 20)}...\n🌐 Network: ${withdrawal.network || 'N/A'}\n📅 Time: ${new Date(withdrawal.created_at).toLocaleString()}\n🆔 ID: ${withdrawal.id.substring(0, 8)}...`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve_withdrawal_${withdrawal.id}` },
        { text: '❌ Reject', callback_data: `reject_withdrawal_${withdrawal.id}` }
      ]
    ]
  };

  await sendTelegramMessage(chatId, message, keyboard);
}

// Approve transaction
async function approveTransaction(type: string, txnId: string, chatId: string, callbackQueryId: string) {
  const timestamp = new Date().toISOString();
  const adminEmail = 'admin@ticgloballtd.com';

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

      await answerCallbackQuery(callbackQueryId, '✅ Deposit approved!');
      await sendTelegramMessage(chatId, `✅ **DEPOSIT APPROVED**\n\n👤 User: ${data.user_email}\n💰 Amount: $${data.amount}\n⏰ Approved at: ${new Date().toLocaleString()}`);

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

      await answerCallbackQuery(callbackQueryId, '✅ Withdrawal approved!');
      await sendTelegramMessage(chatId, `✅ **WITHDRAWAL APPROVED**\n\n👤 User: ${data.user_email}\n💰 Amount: $${data.amount}\n⏰ Approved at: ${new Date().toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error approving transaction:', error);
    await answerCallbackQuery(callbackQueryId, '❌ Error approving transaction');
    await sendTelegramMessage(chatId, `❌ Error approving ${type}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Reject transaction
async function rejectTransaction(type: string, txnId: string, chatId: string, callbackQueryId: string) {
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

      await answerCallbackQuery(callbackQueryId, '❌ Deposit rejected');
      await sendTelegramMessage(chatId, `❌ **DEPOSIT REJECTED**\n\n👤 User: ${data.user_email}\n💰 Amount: $${data.amount}\n⏰ Rejected at: ${new Date().toLocaleString()}`);

    } else if (type === 'withdrawal') {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          admin_notes: `Rejected via Telegram bot at ${timestamp}`,
          processed_by: adminEmail,
          processed_at: timestamp
        })
        .eq('id', txnId)
        .select()
        .single();

      if (error) throw error;

      await answerCallbackQuery(callbackQueryId, '❌ Withdrawal rejected');
      await sendTelegramMessage(chatId, `❌ **WITHDRAWAL REJECTED**\n\n👤 User: ${data.user_email}\n💰 Amount: $${data.amount}\n⏰ Rejected at: ${new Date().toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error rejecting transaction:', error);
    await answerCallbackQuery(callbackQueryId, '❌ Error rejecting transaction');
    await sendTelegramMessage(chatId, `❌ Error rejecting ${type}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// GET endpoint for testing webhook status
export async function GET(request: NextRequest) {
  console.log('GET request to telegram webhook endpoint');

  return NextResponse.json({
    status: 'Telegram webhook is active',
    timestamp: new Date().toISOString(),
    bot_token_configured: !!BOT_TOKEN,
    bot_token_length: BOT_TOKEN?.length || 0,
    admin_id: ADMIN_TELEGRAM_ID,
    webhook_secret_configured: !!WEBHOOK_SECRET,
    environment: process.env.NODE_ENV || 'development'
  });
}
