import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST - Get user wallet balance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Getting wallet balance for:', userEmail);
    console.log('📊 Request timestamp:', new Date().toISOString());

    // Get user wallet balance
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (walletError) {
      console.error('❌ Error getting wallet balance for', userEmail, ':', walletError);
      
      // If wallet doesn't exist, create one
      if (walletError.code === 'PGRST116') {
        const { data: newWallet, error: createError } = await supabaseAdmin
          .from('user_wallets')
          .insert({
            user_email: userEmail,
            total_balance: 0,
            tic_balance: 0,
            gic_balance: 0,
            staking_balance: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating wallet:', createError);
          return NextResponse.json(
            { 
              success: false,
              error: 'Failed to create wallet',
              details: createError.message
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          balance: newWallet
        });
      }

      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to get wallet balance',
          details: walletError.message
        },
        { status: 500 }
      );
    }

    console.log('✅ Successfully retrieved wallet balance for', userEmail, ':', {
      total_balance: walletData.total_balance,
      tic_balance: walletData.tic_balance,
      last_updated: walletData.last_updated
    });

    return NextResponse.json({
      success: true,
      balance: walletData
    });

  } catch (error) {
    console.error('Error in wallet balance API:', error);
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

// GET - Get wallet balance for authenticated user (easier testing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testEmail = searchParams.get('email');

    // Use test email if provided, otherwise try to get authenticated user
    let userEmail = testEmail;

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'Email parameter required for testing' },
        { status: 400 }
      );
    }

    console.log('🔍 GET: Getting wallet balance for:', userEmail);

    // Get user wallet balance
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (walletError) {
      console.error('❌ GET: Error getting wallet balance for', userEmail, ':', walletError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get wallet balance',
          details: walletError.message,
          userEmail: userEmail
        },
        { status: 500 }
      );
    }

    console.log('✅ GET: Successfully retrieved wallet balance for', userEmail, ':', {
      total_balance: walletData.total_balance,
      tic_balance: walletData.tic_balance,
      last_updated: walletData.last_updated
    });

    return NextResponse.json({
      success: true,
      balance: walletData,
      userEmail: userEmail
    });

  } catch (error) {
    console.error('Error in GET wallet balance API:', error);
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
