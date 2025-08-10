import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseServiceKey
  });
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

// POST - Get user wallet balance
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Environment variables not configured properly');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      console.error('❌ No userEmail provided in request');
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Getting wallet balance for:', userEmail);
    console.log('📊 Request timestamp:', new Date().toISOString());

    // Get user wallet balance using maybeSingle() to avoid errors when no rows exist
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .maybeSingle();

    if (walletError) {
      console.error('❌ Error querying wallet balance for', userEmail, ':', walletError);
      return NextResponse.json(
        { error: 'Failed to query wallet balance' },
        { status: 500 }
      );
    }

    // If wallet doesn't exist, create one
    if (!walletData) {
      console.log('📝 Creating new wallet for:', userEmail);

      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('user_wallets')
        .insert({
          user_email: userEmail,
          total_balance: 0,
          tic_balance: 0,
          gic_balance: 0,
          staking_balance: 0,
          partner_wallet_balance: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating wallet for', userEmail, ':', createError);
        return NextResponse.json(
          { error: 'Failed to create wallet' },
          { status: 500 }
        );
      }

      console.log('✅ Created new wallet for', userEmail);
      return NextResponse.json({
        wallet: newWallet
      });
    }

    // Wallet exists, return it
    console.log('✅ Successfully retrieved wallet balance for', userEmail, ':', {
      total_balance: walletData.total_balance,
      tic_balance: walletData.tic_balance,
      last_updated: walletData.last_updated
    });

    return NextResponse.json({
      wallet: walletData
    });

  } catch (error) {
    console.error('❌ Unexpected error in wallet balance API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get wallet balance for authenticated user (easier testing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testEmail = searchParams.get('email');

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Email parameter required for GET requests' },
        { status: 400 }
      );
    }

    console.log('🔍 GET: Getting wallet balance for:', testEmail);

    // Get user wallet balance using maybeSingle() to avoid errors when no rows exist
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', testEmail)
      .maybeSingle();

    if (walletError) {
      console.error('❌ GET: Error querying wallet balance for', testEmail, ':', walletError);
      return NextResponse.json(
        { error: 'Failed to query wallet balance' },
        { status: 500 }
      );
    }

    // If wallet doesn't exist, create one
    if (!walletData) {
      console.log('📝 GET: Creating new wallet for:', testEmail);

      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('user_wallets')
        .insert({
          user_email: testEmail,
          total_balance: 0,
          tic_balance: 0,
          gic_balance: 0,
          staking_balance: 0,
          partner_wallet_balance: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ GET: Error creating wallet for', testEmail, ':', createError);
        return NextResponse.json(
          { error: 'Failed to create wallet' },
          { status: 500 }
        );
      }

      console.log('✅ GET: Created new wallet for', testEmail);
      return NextResponse.json({
        wallet: newWallet
      });
    }

    // Wallet exists, return it
    console.log('✅ GET: Successfully retrieved wallet balance for', testEmail, ':', {
      total_balance: walletData.total_balance,
      tic_balance: walletData.tic_balance,
      last_updated: walletData.last_updated
    });

    return NextResponse.json({
      wallet: walletData
    });

  } catch (error) {
    console.error('❌ GET: Unexpected error in wallet balance API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
