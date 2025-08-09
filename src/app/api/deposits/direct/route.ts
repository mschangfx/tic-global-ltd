import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Direct Supabase client with service role
const supabase = createClient(
  'https://clsowgswufspftizyjlc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsc293Z3N3dWZzcGZ0aXp5amxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY5NDE4MCwiZXhwIjoyMDY0MjcwMTgwfQ.ZryoITxcPfjWYWXQfou8ymnafpT7EZc7B4Rr0YsGEK8',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Direct deposit API called');
    
    // Handle both JSON and FormData
    let data: any = {};
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      data = {
        userEmail: formData.get('userEmail'),
        amount: formData.get('amount'),
        currency: formData.get('currency'),
        paymentMethod: formData.get('paymentMethod'),
        network: formData.get('network'),
        accountNumber: formData.get('accountNumber'),
        accountName: formData.get('accountName')
      };
    }
    
    console.log('📊 Received data:', data);
    
    const { userEmail, amount, currency, paymentMethod, network } = data;
    
    // Validate required fields
    if (!amount) {
      return NextResponse.json({
        success: false,
        message: 'Amount is required'
      }, { status: 400 });
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid deposit amount'
      }, { status: 400 });
    }

    // Create deposit record with minimal required fields
    const depositId = uuidv4();
    const now = new Date().toISOString();
    
    const depositRecord = {
      id: depositId,
      user_email: userEmail || 'user@ticglobal.com',
      transaction_hash: `direct_${Date.now()}`,
      method_id: paymentMethod || 'usdt_trc20',
      method_name: 'USDT (TRC20)',
      amount: depositAmount,
      currency: 'USD',
      network: network || 'TRC20',
      deposit_address: 'TBpga5zct6vKAenvPecepzUfuK8raGA3Jh',
      status: 'pending',
      processing_fee: 0,
      network_fee: 0,
      final_amount: depositAmount,
      confirmation_count: 0,
      required_confirmations: 1,
      admin_notes: `Direct API deposit - $${depositAmount} USDT with receipt`,
      request_metadata: {
        source: 'direct_api',
        amount: depositAmount,
        currency: currency || 'USDT',
        timestamp: now,
        hasReceipt: true
      },
      created_at: now,
      updated_at: now,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    console.log('🔄 Inserting deposit record:', depositRecord);

    // Direct database insertion
    const { data: insertedDeposit, error: insertError } = await supabase
      .from('deposits')
      .insert([depositRecord])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Database insertion error:', insertError);
      return NextResponse.json({
        success: false,
        message: 'Database error',
        error: insertError.message,
        code: insertError.code,
        details: insertError.details
      }, { status: 500 });
    }

    console.log('✅ Deposit created successfully:', insertedDeposit.id);

    // Try to create notification (non-critical)
    try {
      await supabase
        .from('notifications')
        .insert({
          user_email: 'admin@ticglobal.com',
          title: 'New Crypto Deposit',
          message: `New USDT deposit of $${depositAmount} from ${userEmail || 'user@ticglobal.com'}`,
          type: 'admin',
          priority: 'high',
          metadata: {
            depositId: insertedDeposit.id,
            amount: depositAmount,
            method: 'usdt_trc20'
          },
          created_at: now
        });
      console.log('✅ Admin notification created');
    } catch (notifError) {
      console.log('⚠️ Notification failed (non-critical):', notifError);
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit request created successfully',
      deposit: {
        id: insertedDeposit.id,
        amount: depositAmount,
        currency: 'USD',
        status: 'pending',
        created_at: insertedDeposit.created_at
      }
    });

  } catch (error) {
    console.error('❌ Direct API critical error:', error);
    return NextResponse.json({
      success: false,
      message: 'Critical error in direct API',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('deposits')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Direct deposit API is working',
      timestamp: new Date().toISOString(),
      database: 'Connected'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'API test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
