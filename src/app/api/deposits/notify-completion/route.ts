import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { depositId, userEmail, amount, method } = await request.json();

    if (!depositId || !userEmail || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🔔 Sending deposit completion notification:', {
      depositId,
      userEmail,
      amount,
      method
    });

    // Get current wallet balance
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .rpc('get_calculated_wallet_balance', {
        user_email_param: userEmail
      });

    if (balanceError) {
      console.error('Error getting wallet balance:', balanceError);
    }

    const currentBalance = balanceData?.[0]?.total_balance || 0;

    // Create a notification record (you can extend this to send emails, push notifications, etc.)
    const { error: notificationError } = await supabaseAdmin
      .from('user_notifications')
      .insert({
        user_email: userEmail,
        type: 'deposit_completed',
        title: 'Deposit Completed',
        message: `Your $${amount} deposit via ${method || 'payment method'} has been completed and added to your wallet.`,
        data: {
          depositId,
          amount,
          method,
          newBalance: currentBalance
        },
        created_at: new Date().toISOString()
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification creation fails
    }

    // You could also send an email notification here
    // await sendDepositCompletionEmail(userEmail, amount, method, currentBalance);

    return NextResponse.json({
      success: true,
      message: 'Deposit completion notification sent',
      newBalance: currentBalance
    });

  } catch (error) {
    console.error('Error in deposit notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check recent notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Get recent notifications for the user
    const { data: notifications, error } = await supabaseAdmin
      .from('user_notifications')
      .select('*')
      .eq('user_email', userEmail)
      .eq('type', 'deposit_completed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || []
    });

  } catch (error) {
    console.error('Error in get notifications API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
