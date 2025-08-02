import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createRegularClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user email
    const userEmail = await getAuthenticatedUserEmail();
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Use service role client for database queries
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

    // Get withdrawal by transaction ID
    const { data: withdrawal, error } = await supabaseAdmin
      .from('withdrawal_requests')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('user_email', userEmail)
      .single();

    if (error) {
      console.error('Error fetching withdrawal:', error);
      return NextResponse.json(
        { error: 'Failed to fetch withdrawal' },
        { status: 500 }
      );
    }

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        transaction_id: withdrawal.transaction_id,
        status: withdrawal.status,
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        method_id: withdrawal.method_id,
        destination_address: withdrawal.destination_address,
        processed_at: withdrawal.processed_at,
        processed_by: withdrawal.processed_by,
        created_at: withdrawal.created_at,
        updated_at: withdrawal.updated_at
      }
    });

  } catch (error) {
    console.error('Error in withdrawal status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
