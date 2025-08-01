import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Generate unique wallet address for user
const generateWalletAddress = (userEmail: string): string => {
  // Create a hash-like address based on user email
  const hash = userEmail.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  // Generate a wallet address with "WLT" prefix (Wallet) to avoid confusion with TIC asset
  const timestamp = Date.now().toString().slice(-6);
  const baseAddress = `WLT${hash.toString().padStart(4, '0')}${timestamp}`;
  return baseAddress.toUpperCase();
};

// POST - Get or create user wallet address
export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('📍 Getting wallet address for:', userEmail);

    // Check if user already has a wallet address
    const { data: existingAddress, error: fetchError } = await supabaseAdmin
      .from('user_wallet_addresses')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching wallet address:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch wallet address' },
        { status: 500 }
      );
    }

    // If address exists, return it
    if (existingAddress) {
      console.log('✅ Found existing wallet address:', existingAddress.wallet_address);
      return NextResponse.json({
        success: true,
        walletAddress: existingAddress.wallet_address,
        isNew: false
      });
    }

    // Generate new wallet address
    const newWalletAddress = generateWalletAddress(userEmail);
    console.log('🆕 Generated new wallet address:', newWalletAddress);

    // Store the new address
    const { data: createdAddress, error: createError } = await supabaseAdmin
      .from('user_wallet_addresses')
      .insert({
        user_email: userEmail,
        wallet_address: newWalletAddress,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating wallet address:', createError);
      return NextResponse.json(
        { error: 'Failed to create wallet address' },
        { status: 500 }
      );
    }

    console.log('✅ Created new wallet address:', createdAddress);

    return NextResponse.json({
      success: true,
      walletAddress: createdAddress.wallet_address,
      isNew: true
    });

  } catch (error) {
    console.error('Error in wallet address API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user wallet address by email (query parameter)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userEmail = url.searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('📍 Getting wallet address for:', userEmail);

    // Get user wallet address
    const { data: addressData, error: fetchError } = await supabaseAdmin
      .from('user_wallet_addresses')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Wallet address not found'
        });
      }
      
      console.error('Error fetching wallet address:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch wallet address' },
        { status: 500 }
      );
    }

    console.log('✅ Found wallet address:', addressData.wallet_address);

    return NextResponse.json({
      success: true,
      walletAddress: addressData.wallet_address
    });

  } catch (error) {
    console.error('Error in wallet address API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
