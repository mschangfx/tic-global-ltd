import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST - Validate wallet address and get user info
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Validating wallet address:', walletAddress);

    // Check if wallet address exists and is valid
    const { data: addressData, error: fetchError } = await supabaseAdmin
      .from('user_wallet_addresses')
      .select('user_email, wallet_address, created_at')
      .eq('wallet_address', walletAddress)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('❌ Wallet address not found:', walletAddress);
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'Wallet address not found'
        });
      }
      
      console.error('Error validating wallet address:', fetchError);
      return NextResponse.json(
        { error: 'Failed to validate wallet address' },
        { status: 500 }
      );
    }

    console.log('✅ Valid wallet address found:', {
      address: addressData.wallet_address,
      userEmail: addressData.user_email
    });

    return NextResponse.json({
      success: true,
      valid: true,
      userEmail: addressData.user_email,
      walletAddress: addressData.wallet_address,
      createdAt: addressData.created_at
    });

  } catch (error) {
    console.error('Error in wallet address validation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Validate wallet address (query parameter)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const walletAddress = url.searchParams.get('address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Validating wallet address:', walletAddress);

    // Check if wallet address exists and is valid
    const { data: addressData, error: fetchError } = await supabaseAdmin
      .from('user_wallet_addresses')
      .select('user_email, wallet_address, created_at')
      .eq('wallet_address', walletAddress)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('❌ Wallet address not found:', walletAddress);
        return NextResponse.json({
          success: false,
          valid: false,
          error: 'Wallet address not found'
        });
      }
      
      console.error('Error validating wallet address:', fetchError);
      return NextResponse.json(
        { error: 'Failed to validate wallet address' },
        { status: 500 }
      );
    }

    console.log('✅ Valid wallet address found:', {
      address: addressData.wallet_address,
      userEmail: addressData.user_email
    });

    return NextResponse.json({
      success: true,
      valid: true,
      userEmail: addressData.user_email,
      walletAddress: addressData.wallet_address,
      createdAt: addressData.created_at
    });

  } catch (error) {
    console.error('Error in wallet address validation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
