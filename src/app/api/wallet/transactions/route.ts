import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('🔍 GET: Getting wallet transactions for:', email);

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Verify the user is authenticated and requesting their own data
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get wallet transactions
    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ GET: Error getting wallet transactions:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    console.log(`✅ GET: Successfully retrieved ${transactions?.length || 0} transactions for ${email}`);

    return NextResponse.json({
      success: true,
      transactions: transactions || []
    });

  } catch (error) {
    console.error('❌ GET: Error in wallet transactions API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_email, transaction_type, amount, currency, description, metadata } = await request.json();

    console.log('🔄 POST: Creating wallet transaction for:', user_email);
    console.log('🔍 POST: Transaction details:', { transaction_type, amount, currency, description });

    if (!user_email || !transaction_type || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: user_email, transaction_type, amount' },
        { status: 400 }
      );
    }

    // Generate a unique transaction ID
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create wallet transaction record
    const { data: transaction, error } = await supabase
      .from('wallet_transactions')
      .insert({
        user_email,
        transaction_id: transactionId,
        transaction_type,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        description: description || `${transaction_type} transaction`,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ POST: Error creating wallet transaction:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to create transaction record' },
        { status: 500 }
      );
    }

    console.log('✅ POST: Successfully created wallet transaction:', transaction.id);

    return NextResponse.json({
      success: true,
      transaction
    });

  } catch (error) {
    console.error('❌ POST: Error in wallet transactions API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
