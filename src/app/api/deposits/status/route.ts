import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Helper function to get authenticated user email from both auth methods
async function getAuthenticatedUserEmail(): Promise<string | null> {
  try {
    // Method 1: Try NextAuth session (Google OAuth)
    const nextAuthSession = await getServerSession(authOptions);
    if (nextAuthSession?.user?.email) {
      return nextAuthSession.user.email;
    }

    // Method 2: Try Supabase auth (manual login)
    const supabase = createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (supabaseUser?.email) {
      return supabaseUser.email;
    }

    return null;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

// GET - Check transaction status by ID (requires authentication)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const depositId = searchParams.get('depositId');

    if (!transactionId && !depositId) {
      return NextResponse.json(
        { error: 'Transaction ID or Deposit ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user email using hybrid approach
    const userEmail = await getAuthenticatedUserEmail();
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Use service role client for database queries
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get deposit status from appropriate table
    let deposit, error;

    if (depositId) {
      // Check deposits table for GCash/PayMaya - only user's own deposits
      const result = await supabase
        .from('deposits')
        .select(`
          id,
          status,
          amount,
          method_name,
          user_email,
          admin_notes,
          created_at,
          updated_at
        `)
        .eq('id', depositId)
        .eq('user_email', userEmail)
        .single();
      deposit = result.data;
      error = result.error;
    } else {
      // Check crypto deposits table - only user's own deposits
      const result = await supabase
        .from('deposits')
        .select(`
          id,
          status,
          amount,
          currency,
          network,
          user_email,
          admin_notes,
          approved_by,
          approved_at,
          created_at,
          updated_at
        `)
        .eq('id', transactionId)
        .eq('user_email', userEmail)
        .single();
      deposit = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error fetching deposit:', error);
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    if (!deposit) {
      return NextResponse.json(
        { error: 'Deposit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deposit: {
        id: deposit.id,
        status: deposit.status,
        amount: deposit.amount,
        method: (deposit as any).method_name || (deposit as any).method || `${(deposit as any).currency || 'Unknown'} (${(deposit as any).network || 'Unknown'})`,
        currency: (deposit as any).currency || null,
        network: (deposit as any).network || null,
        admin_notes: deposit.admin_notes,
        approved_by: (deposit as any).approved_by || null,
        approved_at: (deposit as any).approved_at || null,
        created_at: deposit.created_at,
        updated_at: deposit.updated_at
      },
      // Keep backward compatibility
      transaction: {
        id: deposit.id,
        status: deposit.status,
        amount: deposit.amount,
        currency: (deposit as any).currency || null,
        network: (deposit as any).network || null,
        admin_notes: deposit.admin_notes,
        approved_by: (deposit as any).approved_by || null,
        approved_at: (deposit as any).approved_at || null,
        created_at: deposit.created_at,
        updated_at: deposit.updated_at
      }
    });

  } catch (error) {
    console.error('Error checking transaction status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
