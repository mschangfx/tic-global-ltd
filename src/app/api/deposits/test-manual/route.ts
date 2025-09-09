import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test manual deposits API called');
    
    const formData = await request.formData();
    
    // Log all form data for debugging
    console.log('📋 Form data received:');
    const formEntries = Array.from(formData.entries());
    for (const [key, value] of formEntries) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    // Extract form data
    const userEmail = formData.get('userEmail') as string;
    const amount = formData.get('amount') as string;
    const currency = formData.get('currency') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const network = formData.get('network') as string;
    const accountNumber = formData.get('accountNumber') as string;
    const accountName = formData.get('accountName') as string;
    const receiptFile = formData.get('receipt') as File;

    console.log('📊 Parsed data:', {
      userEmail,
      amount,
      currency,
      paymentMethod,
      network,
      accountNumber,
      accountName,
      hasReceipt: !!receiptFile
    });

    // Validate required fields
    if (!userEmail || !amount || !currency || !paymentMethod) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!receiptFile) {
      return NextResponse.json(
        { success: false, message: 'Receipt upload is required for all deposits' },
        { status: 400 }
      );
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid deposit amount' },
        { status: 400 }
      );
    }

    // Create a simple test deposit record
    const testDeposit = {
      id: `test-${Date.now()}`,
      user_email: userEmail,
      amount: depositAmount,
      currency: currency,
      payment_method: paymentMethod,
      network: network,
      status: 'pending',
      created_at: new Date().toISOString(),
      admin_notes: `Test manual deposit - ${paymentMethod} - requires admin approval`
    };

    console.log('✅ Test deposit created:', testDeposit);

    return NextResponse.json({
      success: true,
      message: 'Test deposit created successfully - requires manual admin approval',
      deposit: testDeposit
    });

  } catch (error) {
    console.error('❌ Test manual deposits API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error in test API',
        error: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test manual deposits API is working',
    timestamp: new Date().toISOString()
  });
}
