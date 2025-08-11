import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { parseDepositAmount, CONVERSION_RATES } from '@/lib/utils/currency';

// Force dynamic rendering and use Node.js runtime for file handling
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Validate file type (match Supabase bucket allowed types)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(receiptFile.type)) {
      return NextResponse.json(
        { success: false, message: 'Receipt must be an image (JPEG, PNG, WebP) or PDF file' },
        { status: 400 }
      );
    }

    // Validate minimum amount based on payment method (fixed for GCash/PayMaya USD amounts)
    const { amount: depositAmount, paymentMethod } = validatedData;

    if (paymentMethod === 'usdt_trc20' || paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon') {
      // USDT minimum is $10 USD
      if (depositAmount < 10) {
        return NextResponse.json(
          { success: false, message: 'Minimum USDT deposit amount is $10' },
          { status: 400 }
        );
      }
    } else if (paymentMethod === 'gcash' || paymentMethod === 'paymaya') {
      // GCash/PayMaya methods: amounts are submitted in USD, minimum is $10 USD (≈₱555)
      if (depositAmount < 10) {
        return NextResponse.json(
          { success: false, message: 'Minimum deposit amount is $10 (≈₱555) for digital wallet payments' },
          { status: 400 }
        );
      }
    } else {
      // Other methods: assume PHP currency, minimum is ₱500
      if (depositAmount < 500) {
        return NextResponse.json(
          { success: false, message: 'Minimum deposit amount is ₱500 for this payment method' },
          { status: 400 }
        );
      }
    }

    // Save receipt file to Supabase Storage
    let receiptPath = '';
    try {
      // Validate file size (max 5MB to match Supabase bucket limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (receiptFile.size > maxSize) {
        return NextResponse.json(
          { success: false, message: 'Receipt file size must be less than 5MB' },
          { status: 400 }
        );
      }

      // Sanitize filename
      const fileExtension = receiptFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeName = receiptFile.name.replace(/[^\w.\-]+/g, "_");
      const fileName = `${Date.now()}_${uuidv4()}_${safeName}`;
      const filePath = `receipts/${fileName}`;

      console.log('📁 Uploading receipt to Supabase Storage:', filePath);

      // Convert file to buffer
      const bytes = await receiptFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Supabase Storage (using existing user-uploads bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, buffer, {
          contentType: receiptFile.type || 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        return NextResponse.json(
          { success: false, message: 'Failed to upload receipt file' },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      receiptPath = urlData.publicUrl;
      console.log('✅ Receipt uploaded successfully:', receiptPath);

    } catch (error) {
      console.error('❌ Error saving receipt:', error);
      if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'EROFS') {
        return NextResponse.json(
          { success: false, message: 'Storage is read-only, using cloud storage' },
          { status: 507 }
        );
      }
      return NextResponse.json(
        { success: false, message: 'Failed to save receipt file' },
        { status: 500 }
      );
    }

    // Calculate USD amount using standard conversion rate ($1 = ₱63)
    // The frontend now sends the correct USD amount, but we'll validate the conversion
    let usdAmount = depositAmount; // Frontend sends USD amount
    let originalCurrency = validatedData.originalCurrency || validatedData.currency;
    let conversionRate = 1;

    // Get conversion details from form data if available
    const originalAmount = parseFloat(formData.get('originalAmount') as string || depositAmount.toString());
    const submittedConversionRate = parseFloat(formData.get('conversionRate') as string || '1');

    if (paymentMethod === 'usdt_trc20' || paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon') {
      // USDT is already in USD
      usdAmount = depositAmount;
      originalCurrency = 'USD';
      conversionRate = 1;
    } else if (paymentMethod === 'gcash' || paymentMethod === 'paymaya') {
      // For PHP methods, validate the conversion rate
      if (submittedConversionRate === CONVERSION_RATES.USD_TO_PHP) {
        // Frontend used correct conversion rate
        usdAmount = depositAmount; // Already converted to USD by frontend
        originalCurrency = 'PHP';
        conversionRate = CONVERSION_RATES.PHP_TO_USD;
      } else {
        // Fallback: use our standard conversion
        const { usdAmount: convertedUsd } = parseDepositAmount(originalAmount, paymentMethod);
        usdAmount = convertedUsd;
        originalCurrency = 'PHP';
        conversionRate = CONVERSION_RATES.PHP_TO_USD;
      }
    } else {
      // For other methods, assume USD
      usdAmount = depositAmount;
      originalCurrency = validatedData.currency;
      conversionRate = 1;
    }

    console.log('💱 Standard currency conversion:', {
      originalAmount,
      depositAmount,
      usdAmount,
      originalCurrency,
      conversionRate,
      standardRate: `$1 USD = ₱${CONVERSION_RATES.USD_TO_PHP} PHP`
    });

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
          originalAmount: originalAmount,
          originalCurrency: originalCurrency,
          conversionRate: conversionRate,
          standardConversionRate: CONVERSION_RATES.USD_TO_PHP,
          phpEquivalent: originalCurrency === 'USD' ? usdAmount * CONVERSION_RATES.USD_TO_PHP : originalAmount,
          usdEquivalent: usdAmount,
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
