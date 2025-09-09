import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Creating test deposit for admin approval testing...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create a test deposit with pending status
    const testDeposit = {
      user_email: 'admin-test@ticgloballtd.com',
      amount: 50,
      currency: 'USD',
      status: 'pending',
      payment_method: 'test',
      transaction_hash: 'test-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      admin_notes: 'Test deposit created for admin approval testing'
    };
    
    console.log('🔍 Inserting test deposit:', testDeposit);
    
    const { data, error } = await supabase
      .from('deposits')
      .insert([testDeposit])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating test deposit:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create test deposit',
        details: error.message
      }, { status: 500 });
    }
    
    console.log('✅ Test deposit created successfully:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Test deposit created successfully',
      deposit: data,
      instructions: 'You can now test the approval process on this pending deposit in the admin panel'
    });
    
  } catch (error) {
    console.error('❌ Error in create-test-deposit:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}
