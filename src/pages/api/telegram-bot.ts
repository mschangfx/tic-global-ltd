import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8251984612:AAH4YKXCFnlxQsULco-CNmG3DbekrRY-YmA';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '829590330';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers to allow external access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'Telegram bot webhook is active',
      timestamp: new Date().toISOString(),
      bot_configured: !!BOT_TOKEN,
      admin_id: ADMIN_TELEGRAM_ID,
      method: 'GET'
    });
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      
      console.log('Telegram webhook received:', JSON.stringify(body, null, 2));
      
      // Handle different types of updates
      if (body.message) {
        await handleMessage(body.message);
      } else if (body.callback_query) {
        await handleCallbackQuery(body.callback_query);
      }

      return res.status(200).json({ ok: true });

    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
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
    return;
  }

  const [action, type, txnId] = data.split('_');

  try {
    if (action === 'approve') {
      await approveTransaction(type, txnId, chatId);
    } else if (action === 'reject') {
      await rejectTransaction(type, txnId, chatId);
    }
  } catch (error) {
    console.error('Callback error:', error);
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

// Approve transaction
async function approveTransaction(type: string, txnId: string, chatId: string) {
  const timestamp = new Date().toISOString();
  
  try {
    if (type === 'deposit') {
      await supabase
        .from('deposits')
        .update({
          status: 'approved',
          admin_notes: `Approved via Telegram bot at ${timestamp}`,
          updated_at: timestamp
        })
        .eq('id', txnId);

      await sendTelegramMessage(chatId, `✅ **DEPOSIT APPROVED**\n\n🆔 ID: ${txnId.substring(0, 8)}...\n⏰ Approved at: ${new Date().toLocaleString()}`);

    } else if (type === 'withdrawal') {
      await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          admin_notes: `Approved via Telegram bot at ${timestamp}`,
          processed_at: timestamp
        })
        .eq('id', txnId);

      await sendTelegramMessage(chatId, `✅ **WITHDRAWAL APPROVED**\n\n🆔 ID: ${txnId.substring(0, 8)}...\n⏰ Approved at: ${new Date().toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error approving transaction:', error);
    await sendTelegramMessage(chatId, `❌ Error approving ${type}`);
  }
}

// Reject transaction
async function rejectTransaction(type: string, txnId: string, chatId: string) {
  const timestamp = new Date().toISOString();
  
  try {
    if (type === 'deposit') {
      await supabase
        .from('deposits')
        .update({
          status: 'rejected',
          admin_notes: `Rejected via Telegram bot at ${timestamp}`,
          updated_at: timestamp
        })
        .eq('id', txnId);

      await sendTelegramMessage(chatId, `❌ **DEPOSIT REJECTED**\n\n🆔 ID: ${txnId.substring(0, 8)}...\n⏰ Rejected at: ${new Date().toLocaleString()}`);

    } else if (type === 'withdrawal') {
      await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          admin_notes: `Rejected via Telegram bot at ${timestamp}`,
          processed_at: timestamp
        })
        .eq('id', txnId);

      await sendTelegramMessage(chatId, `❌ **WITHDRAWAL REJECTED**\n\n🆔 ID: ${txnId.substring(0, 8)}...\n⏰ Rejected at: ${new Date().toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error rejecting transaction:', error);
    await sendTelegramMessage(chatId, `❌ Error rejecting ${type}`);
  }
}
