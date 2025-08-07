import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID!;
const NOTIFICATION_SECRET = process.env.NOTIFICATION_SECRET || 'notify-secret-2024';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Telegram API helper
async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  try {
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

    const result = await response.json();
    if (!response.ok) {
      console.error('Telegram API error:', result);
    }
    return result;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

// Send deposit notification
async function sendDepositNotification(deposit: any) {
  const message = `🧾 **NEW DEPOSIT REQUEST**\n\n👤 User: ${deposit.user_email}\n💰 Amount: $${deposit.amount} ${deposit.currency}\n🌐 Network: ${deposit.network}\n📅 Time: ${new Date(deposit.created_at).toLocaleString()}\n🆔 ID: ${deposit.id.substring(0, 8)}...\n\n⚡ *Instant approval available below*`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve_deposit_${deposit.id}` },
        { text: '❌ Reject', callback_data: `reject_deposit_${deposit.id}` }
      ]
    ]
  };

  return await sendTelegramMessage(ADMIN_TELEGRAM_ID, message, keyboard);
}

// Send withdrawal notification
async function sendWithdrawalNotification(withdrawal: any) {
  const message = `💸 **NEW WITHDRAWAL REQUEST**\n\n👤 User: ${withdrawal.user_email}\n💰 Amount: $${withdrawal.amount} ${withdrawal.currency}\n🏦 To: ${withdrawal.destination_address.substring(0, 20)}...\n🌐 Network: ${withdrawal.network || 'N/A'}\n📅 Time: ${new Date(withdrawal.created_at).toLocaleString()}\n🆔 ID: ${withdrawal.id.substring(0, 8)}...\n\n⚡ *Instant approval available below*`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve_withdrawal_${withdrawal.id}` },
        { text: '❌ Reject', callback_data: `reject_withdrawal_${withdrawal.id}` }
      ]
    ]
  };

  return await sendTelegramMessage(ADMIN_TELEGRAM_ID, message, keyboard);
}

// POST endpoint to notify admin of new transactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, type, transactionId } = body;

    // Verify secret
    if (secret !== NOTIFICATION_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    if (!type || !transactionId) {
      return NextResponse.json({ error: 'Missing type or transactionId' }, { status: 400 });
    }

    // Get transaction details and send notification
    if (type === 'deposit') {
      const { data: deposit, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error || !deposit) {
        return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
      }

      await sendDepositNotification(deposit);
      return NextResponse.json({ 
        success: true, 
        message: 'Deposit notification sent',
        transactionId: deposit.id
      });

    } else if (type === 'withdrawal') {
      const { data: withdrawal, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error || !withdrawal) {
        return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
      }

      await sendWithdrawalNotification(withdrawal);
      return NextResponse.json({ 
        success: true, 
        message: 'Withdrawal notification sent',
        transactionId: withdrawal.id
      });

    } else {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check all pending transactions and send notifications
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== NOTIFICATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    let notificationsSent = 0;

    // Get pending deposits
    const { data: deposits } = await supabase
      .from('deposits')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get pending withdrawals
    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    // Send deposit notifications
    if (deposits && deposits.length > 0) {
      for (const deposit of deposits) {
        await sendDepositNotification(deposit);
        notificationsSent++;
      }
    }

    // Send withdrawal notifications
    if (withdrawals && withdrawals.length > 0) {
      for (const withdrawal of withdrawals) {
        await sendWithdrawalNotification(withdrawal);
        notificationsSent++;
      }
    }

    // Send summary
    if (notificationsSent > 0) {
      await sendTelegramMessage(
        ADMIN_TELEGRAM_ID, 
        `📋 **Pending Transactions Summary**\n\n💰 Deposits: ${deposits?.length || 0}\n💸 Withdrawals: ${withdrawals?.length || 0}\n\nTotal: ${notificationsSent} notifications sent`
      );
    } else {
      await sendTelegramMessage(
        ADMIN_TELEGRAM_ID, 
        '✅ No pending transactions found'
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `${notificationsSent} notifications sent`,
      deposits: deposits?.length || 0,
      withdrawals: withdrawals?.length || 0
    });

  } catch (error) {
    console.error('Error checking pending transactions:', error);
    return NextResponse.json({ 
      error: 'Failed to check pending transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Example usage in your deposit/withdrawal creation code:
/*
// After creating a deposit in your frontend:
await fetch('/api/notify-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret: 'notify-secret-2024',
    type: 'deposit',
    transactionId: newDeposit.id
  })
});

// After creating a withdrawal in your frontend:
await fetch('/api/notify-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret: 'notify-secret-2024',
    type: 'withdrawal',
    transactionId: newWithdrawal.id
  })
});
*/
