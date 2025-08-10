import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Helper function to get authenticated user email from both auth methods
async function getAuthenticatedUserEmail(): Promise<string | null> {
  try {
    // Method 1: Try Supabase auth (manual login) - this works reliably
    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser?.email) {
        console.log('✅ Found Supabase user:', supabaseUser.email);
        return supabaseUser.email;
      }
    } catch (supabaseError) {
      console.log('Supabase auth not available:', supabaseError);
    }

    // Method 2: Try NextAuth session (Google OAuth) - fallback
    try {
      const nextAuthSession = await getServerSession(authOptions as any);
      if ((nextAuthSession as any)?.user?.email) {
        console.log('✅ Found NextAuth user:', (nextAuthSession as any).user.email);
        return (nextAuthSession as any).user.email;
      }
    } catch (nextAuthError) {
      console.log('NextAuth session not available:', nextAuthError);
    }

    console.log('❌ No authenticated user found');
    return null;
  } catch (error) {
    console.error('❌ Error getting authenticated user:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log('=== NEW DEPOSIT CREATE API CALLED ===');
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

    // Create deposit record - NEW VERSION
    console.log('Creating deposit with data (NEW API):', {
      amount: parseFloat(amount),
      method: method,
      user_email: userEmail,
      status: status
    });

    const depositAmount = parseFloat(amount);
    const processingFee = 0; // No processing fee for GCash/PayMaya
    const networkFee = 0; // No network fee for GCash/PayMaya
    const finalAmount = depositAmount - processingFee - networkFee;

    // Use service role client to insert data (bypasses RLS)
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check for recent duplicate deposits (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentDeposits } = await supabaseAdmin
      .from('deposits')
      .select('id, amount, method_name, created_at')
      .eq('user_email', userEmail)
      .eq('amount', depositAmount)
      .eq('method_name', method)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });

    if (recentDeposits && recentDeposits.length > 0) {
      console.log('⚠️ Duplicate deposit detected, returning existing deposit:', recentDeposits[0]);
      return NextResponse.json({
        success: true,
        message: 'Deposit request already exists',
        deposit: recentDeposits[0],
        isDuplicate: true
      });
    }

    const { data: deposit, error } = await supabaseAdmin
      .from('deposits')
      .insert({
        user_email: userEmail,
        amount: depositAmount,
        currency: 'USD',
        method_id: method.toLowerCase(),
        method_name: method,
        network: method,
        deposit_address: method === 'GCash' ? '09675131248' : method === 'PayMaya' ? '09675131248' : 'N/A',
        processing_fee: processingFee,
        network_fee: networkFee,
        final_amount: finalAmount,
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

    console.log('Deposit created successfully:', deposit);

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
