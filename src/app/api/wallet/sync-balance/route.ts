import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { createClient as createRegularClient } from '@/lib/supabase/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Helper function to get authenticated user email from both auth methods
async function getAuthenticatedUserEmail(): Promise<string | null> {
  try {
    // Method 1: Try Supabase auth (manual login) - this works reliably
    try {
      const supabase = createRegularClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser?.email) {
        return supabaseUser.email;
      }
    } catch (supabaseError) {
      console.log('Supabase auth not available:', supabaseError);
    }

    // Method 2: Try NextAuth session (Google OAuth) - fallback
    try {
      const nextAuthSession = await getServerSession(authOptions as any);
      if ((nextAuthSession as any)?.user?.email) {
        return (nextAuthSession as any).user.email;
      }
    } catch (nextAuthError) {
      console.log('NextAuth session not available:', nextAuthError);
    }

    return null;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user email
    const userEmail = await getAuthenticatedUserEmail();
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Use service role client for database operations
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

    console.log('🔄 Syncing wallet balance for:', userEmail);

    // Call the sync function
    const { data: syncResult, error: syncError } = await supabaseAdmin
      .rpc('sync_user_wallet_balance', {
        user_email_param: userEmail
      });

    if (syncError) {
      console.error('Error syncing wallet balance:', syncError);
      return NextResponse.json(
        { error: 'Failed to sync wallet balance' },
        { status: 500 }
      );
    }

    // Get the updated balance
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('user_email, total_balance, tic_balance, gic_balance, staking_balance, last_updated')
      .eq('user_email', userEmail)
      .single();

    if (walletError) {
      console.error('Error fetching updated wallet balance:', walletError);
      return NextResponse.json(
        { error: 'Failed to fetch updated balance' },
        { status: 500 }
      );
    }

    console.log('✅ Wallet balance synced successfully:', walletData);

    return NextResponse.json({
      success: true,
      message: 'Wallet balance synced successfully',
      wallet: {
        total: parseFloat(walletData.total_balance || '0'),
        tic: parseFloat(walletData.tic_balance || '0'),
        gic: parseFloat(walletData.gic_balance || '0'),
        staking: parseFloat(walletData.staking_balance || '0'),
        lastUpdated: walletData.last_updated
      }
    });

  } catch (error) {
    console.error('Error in wallet sync API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for admin to sync any user's balance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserEmail = searchParams.get('userEmail');
    const adminKey = searchParams.get('adminKey');

    // Simple admin authentication
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    if (!targetUserEmail) {
      return NextResponse.json(
        { error: 'userEmail parameter is required' },
        { status: 400 }
      );
    }

    // Use service role client for database operations
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

    console.log('🔄 Admin syncing wallet balance for:', targetUserEmail);

    // Call the sync function
    const { data: syncResult, error: syncError } = await supabaseAdmin
      .rpc('sync_user_wallet_balance', {
        user_email_param: targetUserEmail
      });

    if (syncError) {
      console.error('Error syncing wallet balance:', syncError);
      return NextResponse.json(
        { error: 'Failed to sync wallet balance' },
        { status: 500 }
      );
    }

    // Get the updated balance
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('user_email, total_balance, tic_balance, gic_balance, staking_balance, last_updated')
      .eq('user_email', targetUserEmail)
      .single();

    if (walletError) {
      console.error('Error fetching updated wallet balance:', walletError);
      return NextResponse.json(
        { error: 'Failed to fetch updated balance' },
        { status: 500 }
      );
    }

    console.log('✅ Admin wallet balance synced successfully:', walletData);

    return NextResponse.json({
      success: true,
      message: 'Wallet balance synced successfully',
      userEmail: targetUserEmail,
      wallet: {
        total: parseFloat(walletData.total_balance || '0'),
        tic: parseFloat(walletData.tic_balance || '0'),
        gic: parseFloat(walletData.gic_balance || '0'),
        staking: parseFloat(walletData.staking_balance || '0'),
        lastUpdated: walletData.last_updated
      }
    });

  } catch (error) {
    console.error('Error in admin wallet sync API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
