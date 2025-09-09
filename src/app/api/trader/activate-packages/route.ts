import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TraderNotificationService } from '@/lib/services/traderNotificationService';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST - Activate account packages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, packageCount } = body;

    if (!userEmail || !packageCount) {
      return NextResponse.json(
        { error: 'User email and package count are required' },
        { status: 400 }
      );
    }

    // Enforce one-time activation rule: must be exactly 25 packages
    if (packageCount !== 25) {
      return NextResponse.json(
        { error: 'Trader activation requires exactly 25 packages. This is a one-time only activation.' },
        { status: 400 }
      );
    }

    console.log('Processing real trader activation for:', userEmail, 'Count:', packageCount);

    // Check if user has already activated trader package
    const { data: existingStatus, error: statusError } = await supabaseAdmin
      .rpc('check_trader_eligibility', {
        user_email_param: userEmail
      });

    if (statusError) {
      console.error('Error checking trader status:', statusError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to check trader status',
          details: statusError.message
        },
        { status: 500 }
      );
    }

    // If user already has 25 or more accounts, they've already activated
    if (existingStatus && existingStatus.accounts_activated >= 25) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already activated your trader package. Each user can only activate once.'
        },
        { status: 400 }
      );
    }

    // Check wallet balance before processing
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('total_balance')
      .eq('user_email', userEmail)
      .single();

    if (walletError || !walletData) {
      return NextResponse.json(
        {
          success: false,
          error: 'User wallet not found. Please ensure you have a wallet set up.'
        },
        { status: 400 }
      );
    }

    const totalCost = packageCount * 2.50; // $2.50 USD per package
    if (walletData.total_balance < totalCost) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. You need $${totalCost.toFixed(2)} but only have $${walletData.total_balance.toFixed(2)}.`
        },
        { status: 400 }
      );
    }

    // Process the real trader activation transaction
    const { data, error } = await supabaseAdmin
      .rpc('activate_account_package', {
        user_email_param: userEmail,
        package_count_param: packageCount
      });

    if (error) {
      console.error('Error activating packages:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to activate packages',
          details: error.message
        },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        {
          success: false,
          error: data.message
        },
        { status: 400 }
      );
    }

    // Record the trader activation transaction for audit trail
    try {
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_email: userEmail,
          transaction_type: 'trader_activation',
          amount: data.total_cost,
          currency: 'USD',
          status: 'completed',
          request_metadata: {
            packages_activated: data.packages_activated,
            package_type: 'usd_2.50_package',
            activation_timestamp: new Date().toISOString(),
            transaction_source: 'trader_dashboard'
          }
        });
    } catch (recordError) {
      console.error('Error recording transaction:', recordError);
      // Don't fail the activation if recording fails
    }

    // Send real-time notification
    const activationTimestamp = new Date().toISOString();
    try {
      await TraderNotificationService.sendTraderActivationNotification({
        user_email: userEmail,
        packages_activated: data.packages_activated,
        total_cost: data.total_cost,
        activation_timestamp: activationTimestamp
      });
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the activation if notification fails
    }

    console.log('Real trader activation completed successfully for:', userEmail);

    return NextResponse.json({
      success: true,
      message: `Successfully activated trader status! ${data.packages_activated} account packages activated for $${data.total_cost}.`,
      packages_activated: data.packages_activated,
      total_cost: data.total_cost,
      activation_timestamp: activationTimestamp,
      real_transaction: true
    });

  } catch (error) {
    console.error('Error in activate packages API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
