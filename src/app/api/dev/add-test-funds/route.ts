import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST - Add test funds to user wallet (DEVELOPMENT ONLY)
export async function POST(request: NextRequest) {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userEmail, amount } = body;

    console.log('Dev API received:', { userEmail, amount });

    if (!userEmail || !amount) {
      return NextResponse.json(
        { error: 'User email and amount are required' },
        { status: 400 }
      );
    }

    // For testing, if no userEmail provided, use a default test email
    const testEmail = userEmail || 'test@example.com';

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    console.log(`[DEV] Adding $${amount} test funds to wallet for:`, testEmail);

    // Check if wallet exists
    const { data: existingWallet, error: checkError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', testEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking wallet:', checkError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to check wallet',
          details: checkError.message
        },
        { status: 500 }
      );
    }

    // If wallet doesn't exist, create one with the test amount
    if (!existingWallet) {
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('user_wallets')
        .insert({
          user_email: testEmail,
          total_balance: amount,
          tic_balance: 0,
          gic_balance: 0,
          staking_balance: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating wallet with test funds:', createError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to create wallet with test funds',
            details: createError.message
          },
          { status: 500 }
        );
      }

      // Record the test transaction
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_email: testEmail,
          transaction_type: 'deposit',
          amount: amount,
          currency: 'USD',
          status: 'completed',
          request_metadata: {
            test_transaction: true,
            developer_added: true,
            timestamp: new Date().toISOString()
          }
        });

      return NextResponse.json({
        success: true,
        message: `Successfully added $${amount} test funds to new wallet`,
        wallet: newWallet,
        test_transaction: true
      });
    }

    // If wallet exists, add to existing balance
    const newBalance = existingWallet.total_balance + amount;
    
    const { data: updatedWallet, error: updateError } = await supabaseAdmin
      .from('user_wallets')
      .update({
        total_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_email', testEmail)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating wallet with test funds:', updateError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to update wallet with test funds',
          details: updateError.message
        },
        { status: 500 }
      );
    }

    // Record the test transaction
    await supabaseAdmin
      .from('transactions')
      .insert({
        user_email: testEmail,
        transaction_type: 'deposit',
        amount: amount,
        currency: 'USD',
        status: 'completed',
        request_metadata: {
          test_transaction: true,
          developer_added: true,
          previous_balance: existingWallet.total_balance,
          new_balance: newBalance,
          timestamp: new Date().toISOString()
        }
      });

    return NextResponse.json({
      success: true,
      message: `Successfully added $${amount} test funds to wallet`,
      wallet: updatedWallet,
      previous_balance: existingWallet.total_balance,
      amount_added: amount,
      new_balance: newBalance,
      test_transaction: true
    });

  } catch (error) {
    console.error('Error in add test funds API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
