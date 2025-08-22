import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Creating test withdrawal for admin approval testing...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create a test withdrawal with pending status
    const testWithdrawal = {
      user_email: 'admin-test@ticgloballtd.com',
      amount: 25,
      currency: 'USD',
      status: 'pending',
      withdrawal_address: 'TTest123AdminTestAddress456789',
      withdrawal_method: 'USDT-TRC20',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      admin_notes: 'Test withdrawal created for admin approval testing'
    };
    
    console.log('🔍 Inserting test withdrawal:', testWithdrawal);
    
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .insert([testWithdrawal])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating test withdrawal:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create test withdrawal',
        details: error.message
      }, { status: 500 });
    }
    
    console.log('✅ Test withdrawal created successfully:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Test withdrawal created successfully',
      withdrawal: data,
      instructions: 'You can now test the approval process on this pending withdrawal in the admin panel'
    });
    
  } catch (error) {
    console.error('❌ Error in create-test-withdrawal:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
