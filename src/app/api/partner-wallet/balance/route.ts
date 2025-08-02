import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey);

// GET - Get partner wallet balance for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    let userEmail = session?.user?.email;

    // If no NextAuth session, try Supabase auth
    if (!userEmail) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email;
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get current partner wallet balance
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('partner_wallet_balance')
      .eq('user_email', userEmail)
      .single();

    if (walletError) {
      console.error('Error fetching partner wallet balance:', walletError);
      
      // If wallet doesn't exist, create one with zero balance
      if (walletError.code === 'PGRST116') {
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
          .select('partner_wallet_balance')
          .single();

        if (createError) {
          console.error('Error creating wallet:', createError);
          return NextResponse.json(
            { success: false, error: 'Failed to create wallet' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          balance: parseFloat(newWallet?.partner_wallet_balance || '0')
        });
      }

      return NextResponse.json(
        { success: false, error: 'Failed to fetch partner wallet balance' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      balance: parseFloat(walletData?.partner_wallet_balance || '0')
    });

  } catch (error) {
    console.error('Error in partner wallet balance API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
