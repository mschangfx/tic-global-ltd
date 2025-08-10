import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with proper configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseServiceKey
  });
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: { persistSession: false }
});

// Shared function to get wallet balance
async function getWalletBalance(userEmail: string) {
  // Validate environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Environment variables not configured properly');
    throw new Error('Server configuration error');
  }

  if (!userEmail) {
    console.error('❌ No userEmail provided');
    throw new Error('User email is required');
  }

  console.log('🔍 Getting wallet balance for:', userEmail);

  // Get user wallet balance using maybeSingle() to avoid errors when no rows exist
  const { data: walletData, error: walletError } = await supabaseAdmin
    .from('user_wallets')
    .select('user_email, total_balance, tic_balance, gic_balance, staking_balance, partner_wallet_balance, last_updated')
    .eq('user_email', userEmail)
    .maybeSingle();

  if (walletError) {
    console.error('❌ Error querying wallet balance for', userEmail, ':', walletError);
    throw new Error('Failed to query wallet balance');
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
      .select('user_email, total_balance, tic_balance, gic_balance, staking_balance, partner_wallet_balance, last_updated')
      .single();

    if (createError) {
      console.error('❌ Error creating wallet for', userEmail, ':', createError);
      throw new Error('Failed to create wallet');
    }

    console.log('✅ Created new wallet for:', userEmail);
    return newWallet;
  }

  console.log('✅ Retrieved wallet balance for:', userEmail);
  return walletData;
}

// GET - Get user wallet balance via query parameter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      console.error('❌ No email provided in query parameters');
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    const walletData = await getWalletBalance(userEmail);

    return NextResponse.json({
      wallet: walletData
    });

  } catch (error: any) {
    console.error('❌ GET wallet balance error:', error);
    const errorMessage = error.message || 'Failed to get wallet balance';
    const statusCode = error.message === 'User email is required' ? 400 :
                      error.message === 'Server configuration error' ? 500 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// POST - Get user wallet balance via request body
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      console.error('❌ No userEmail provided in request body');
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    const walletData = await getWalletBalance(userEmail);

    return NextResponse.json({
      wallet: walletData
    });

  } catch (error: any) {
    console.error('❌ POST wallet balance error:', error);
    const errorMessage = error.message || 'Failed to get wallet balance';
    const statusCode = error.message === 'User email is required' ? 400 :
                      error.message === 'Server configuration error' ? 500 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
