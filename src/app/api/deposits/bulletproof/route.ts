import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Direct Supabase client with service role
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

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Bulletproof deposit API called');
    
    const body = await request.json();
    console.log('📊 Request body:', body);
    
    const { methodId, amount, userEmail } = body;
    
    // Validate required fields
    if (!methodId || !amount) {
      console.log('❌ Missing required fields');
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: methodId and amount'
      }, { status: 400 });
    }

    // Use provided email or default
    const finalUserEmail = userEmail || 'user@ticglobal.com';
    const depositAmount = parseFloat(amount);
    
    if (isNaN(depositAmount) || depositAmount <= 0) {
      console.log('❌ Invalid amount');
      return NextResponse.json({
        success: false,
        message: 'Invalid deposit amount'
      }, { status: 400 });
    }

    // Create simple deposit record
    const depositRecord = {
      id: uuidv4(),
      user_email: finalUserEmail,
      transaction_hash: `crypto_${uuidv4()}`,
      method_id: methodId,
      method_name: methodId === 'usdt_trc20' ? 'USDT (TRC20)' : methodId,
      amount: depositAmount,
      currency: 'USD',
      network: 'TRC20',
      deposit_address: 'TBpga5zct6vKAenvPecepzUfuK8raGA3Jh',
      status: 'pending',
      processing_fee: 0,
      network_fee: 0,
      final_amount: depositAmount,
      confirmation_count: 0,
      required_confirmations: 1,
      admin_notes: 'Crypto deposit with receipt - requires verification',
      request_metadata: {
        methodId,
        amount: depositAmount,
        timestamp: new Date().toISOString(),
        source: 'bulletproof_api'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    console.log('🔄 Creating deposit record:', depositRecord);

    // Insert into database
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .insert([depositRecord])
      .select()
      .single();

    if (depositError) {
      console.error('❌ Database error:', depositError);
      return NextResponse.json({
        success: false,
        message: 'Database error',
        details: depositError.message
      }, { status: 500 });
    }

    console.log('✅ Deposit created successfully:', deposit.id);

    // Create admin notification
    try {
      await supabase
        .from('notifications')
        .insert({
          user_email: 'admin@ticglobal.com',
          title: 'New Crypto Deposit',
          message: `New USDT deposit of $${depositAmount} from ${finalUserEmail}`,
          type: 'admin',
          priority: 'high',
          metadata: {
            depositId: deposit.id,
            userEmail: finalUserEmail,
            amount: depositAmount,
            method: methodId
          }
        });
    } catch (notificationError) {
      console.log('⚠️ Notification creation failed (non-critical):', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit request created successfully',
      transaction: {
        id: deposit.id,
        amount: depositAmount,
        currency: 'USD',
        status: 'pending',
        created_at: deposit.created_at
      }
    });

  } catch (error) {
    console.error('❌ Bulletproof API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Bulletproof deposit API is working',
    timestamp: new Date().toISOString()
  });
}
