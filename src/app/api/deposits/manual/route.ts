import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Validation schema for manual deposits
const ManualDepositSchema = z.object({
  userEmail: z.string().email('Invalid email address'),
  amount: z.string().transform(val => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      throw new Error('Amount must be a positive number');
    }
    return num;
  }),
  currency: z.string().min(1, 'Currency is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  network: z.string().optional(),
  accountNumber: z.string().min(1, 'Account number is required'),
  accountName: z.string().min(1, 'Account name is required'),
});

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

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/deposits/manual called');
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
    const rawData = {
      userEmail: formData.get('userEmail') as string,
      amount: formData.get('amount') as string,
      currency: formData.get('currency') as string,
      paymentMethod: formData.get('paymentMethod') as string,
      network: formData.get('network') as string,
      accountNumber: formData.get('accountNumber') as string,
      accountName: formData.get('accountName') as string,
    };
    
    const receiptFile = formData.get('receipt') as File;
    console.log('📊 Raw data extracted:', rawData);

    // Validate form data using Zod
    let validatedData;
    try {
      validatedData = ManualDepositSchema.parse(rawData);
      console.log('✅ Data validation passed:', validatedData);
    } catch (error) {
      console.error('❌ Validation failed:', error);
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, message: `Validation error: ${error.issues[0]?.message}` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, message: 'Invalid form data' },
        { status: 400 }
      );
    }

    // Validate receipt file
    if (!receiptFile || receiptFile.size === 0) {
      return NextResponse.json(
        { success: false, message: 'Receipt upload is required for all deposits' },
        { status: 400 }
      );
    }

    // Validate minimum amount based on payment method
    const { amount: depositAmount, paymentMethod } = validatedData;
    
    if (paymentMethod === 'usdt_trc20' || paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon') {
      // USDT minimum is $10
      if (depositAmount < 10) {
        return NextResponse.json(
          { success: false, message: 'Minimum USDT deposit amount is $10' },
          { status: 400 }
        );
      }
    } else {
      // PHP methods minimum is 500 PHP
      if (depositAmount < 500) {
        return NextResponse.json(
          { success: false, message: 'Minimum deposit amount is ₱500 for digital wallet payments' },
          { status: 400 }
        );
      }
    }

    // Save receipt file
    let receiptPath = '';
    try {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'receipts');
      await mkdir(uploadsDir, { recursive: true });
      
      const fileExtension = receiptFile.name.split('.').pop() || 'jpg';
      const fileName = `receipt_${uuidv4()}.${fileExtension}`;
      const filePath = join(uploadsDir, fileName);
      
      const bytes = await receiptFile.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));
      
      receiptPath = `/uploads/receipts/${fileName}`;
      console.log('📁 Receipt saved to:', receiptPath);
    } catch (error) {
      console.error('❌ Error saving receipt:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to save receipt file' },
        { status: 500 }
      );
    }

    // Calculate USD amount for storage
    let usdAmount = depositAmount;
    let originalCurrency = validatedData.currency;
    let conversionRate = 1;

    if (paymentMethod === 'usdt_trc20' || paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon') {
      // USDT is already in USD
      usdAmount = depositAmount;
      originalCurrency = 'USD';
      conversionRate = 1;
    } else {
      // Convert PHP to USD (approximate rate: 1 PHP = 0.018 USD)
      usdAmount = depositAmount * 0.018;
      originalCurrency = validatedData.currency;
      conversionRate = 0.018;
    }

    console.log('💱 Currency conversion:', { depositAmount, usdAmount, originalCurrency, conversionRate });

    // Create deposit record in Supabase
    const depositId = uuidv4();
    const transactionHash = `manual_${uuidv4()}`;
    
    console.log('💾 Creating deposit record...');
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .insert({
        id: depositId,
        user_email: validatedData.userEmail,
        transaction_hash: transactionHash,
        method_id: paymentMethod,
        method_name: (paymentMethod === 'usdt_trc20' || paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon')
          ? `USDT (${paymentMethod.includes('_') ? paymentMethod.split('_')[1].toUpperCase() : paymentMethod.split('-')[1].toUpperCase()})`
          : paymentMethod.toUpperCase(),
        amount: usdAmount,
        currency: 'USD',
        network: validatedData.network || 'Manual',
        deposit_address: validatedData.accountNumber,
        status: 'pending',
        request_metadata: {
          receiptUrl: receiptPath,
          accountNumber: validatedData.accountNumber,
          accountName: validatedData.accountName,
          originalAmount: depositAmount,
          originalCurrency: originalCurrency,
          conversionRate: conversionRate,
          submittedAt: new Date().toISOString()
        },
        admin_notes: (paymentMethod === 'usdt_trc20' || paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon')
          ? `Manual USDT (${paymentMethod.includes('_') ? paymentMethod.split('_')[1].toUpperCase() : paymentMethod.split('-')[1].toUpperCase()}) deposit - requires blockchain verification`
          : `Manual ${paymentMethod.toUpperCase()} deposit - requires verification`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (depositError) {
      console.error('❌ Error creating deposit:', depositError);
      return NextResponse.json(
        { success: false, message: 'Failed to create deposit record' },
        { status: 500 }
      );
    }

    console.log('✅ Deposit created successfully:', deposit);

    return NextResponse.json({
      success: true,
      message: 'Manual deposit request created successfully - awaiting admin approval',
      deposit: {
        id: deposit.id,
        amount: usdAmount,
        originalAmount: depositAmount,
        currency: 'USD',
        originalCurrency: originalCurrency,
        status: 'pending',
        paymentMethod,
        receiptUrl: receiptPath,
        transactionHash: transactionHash
      }
    });

  } catch (error) {
    console.error('❌ POST /api/deposits/manual failed:', error);
    
    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: `Validation error: ${error.issues[0]?.message}` },
        { status: 400 }
      );
    }
    
    // Handle Supabase/Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as any).code;
      if (errorCode?.startsWith?.('P2')) {
        return NextResponse.json(
          { success: false, message: `Database error: ${errorCode}` },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Test endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Manual deposits API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}
