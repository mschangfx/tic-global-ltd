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

export async function POST(request: NextRequest) {
  console.log('=== DEPOSIT CREATE API CALLED - NEW VERSION ===');
  try {
    const body = await request.json();
    const { amount, method, status = 'pending' } = body;

    console.log('Request body:', body);

    // Get authenticated user email using hybrid approach
    const userEmail = await getAuthenticatedUserEmail();
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!amount || !method) {
      console.log('Validation failed: missing required fields');
      return NextResponse.json(
        { success: false, error: 'Amount and method are required' },
        { status: 400 }
      );
    }

    // Create deposit record - UPDATED VERSION
    console.log('Creating deposit with data (UPDATED):', {
      amount: parseFloat(amount),
      method: method,
      user_email: userEmail,
      status: status
    });

    // Use service role client to insert data (bypasses RLS)
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: deposit, error } = await supabaseAdmin
      .from('deposits')
      .insert({
        user_email: userEmail,
        amount: parseFloat(amount),
        currency: 'USD',
        method_id: method.toLowerCase(),
        method_name: method,
        network: method,
        deposit_address: method === 'GCash' ? '09675131248' : method === 'PayMaya' ? '09675131248' : 'N/A',
        status: status,
        admin_notes: `Manual ${method} deposit - requires verification`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating deposit:', error);
      return NextResponse.json(
        { success: false, error: `Failed to create deposit record: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      depositId: deposit.id,
      message: 'Deposit request created successfully'
    });

  } catch (error) {
    console.error('Error in deposit creation API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
