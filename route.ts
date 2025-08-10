import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

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

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/deposits/manual called');
    console.log('🌐 Request URL:', request.url);
    console.log('📋 Request method:', request.method);
    console.log('🔑 Headers:', Object.fromEntries(request.headers.entries()));

    const formData = await request.formData();
    console.log('📦 FormData received successfully');
    
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
    const specificDepositId = formData.get('depositId') as string;
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

    // Validate minimum amount based on payment method
    const depositAmount = validatedData.amount;
    const paymentMethod = validatedData.paymentMethod;

    console.log('💰 Deposit details:', { depositAmount, paymentMethod, userEmail: validatedData.userEmail });
    
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
    
    // First, check if there's an existing pending deposit for this user
    console.log('🔍 Checking for existing deposit record...');
    let existingDeposits;

    try {
      if (specificDepositId) {
        // If specific deposit ID provided, look for that exact deposit
        console.log('🎯 Looking for specific deposit ID:', specificDepositId);
        const { data, error } = await supabase
          .from('deposits')
          .select('id, status, request_metadata')
          .eq('id', specificDepositId)
          .eq('user_email', validatedData.userEmail)
          .eq('status', 'pending')
          .limit(1);

        if (error) {
          console.error('❌ Error looking up specific deposit:', error);
          throw error;
        }
        existingDeposits = data;
      } else {
        // Otherwise, look for recent deposit with same amount and method
        const expectedMethodName = (paymentMethod === 'usdt_trc20' || paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon')
          ? `USDT (${paymentMethod.includes('_') ? paymentMethod.split('_')[1].toUpperCase() : paymentMethod.split('-')[1].toUpperCase()})`
          : paymentMethod.toUpperCase();

        console.log('🔍 Looking for deposit with:', {
          userEmail: validatedData.userEmail,
          amount: usdAmount,
          methodName: expectedMethodName
        });

        const { data, error } = await supabase
          .from('deposits')
          .select('id, status, request_metadata')
          .eq('user_email', validatedData.userEmail)
          .eq('amount', usdAmount)
          .eq('method_name', expectedMethodName)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ Error looking up existing deposit:', error);
          throw error;
        }
        existingDeposits = data;
      }

      console.log('🔍 Found existing deposits:', existingDeposits?.length || 0);
    } catch (error) {
      console.error('❌ Error in deposit lookup:', error);
      // Continue with creating new deposit if lookup fails
      existingDeposits = null;
    }

    let deposit;
    let depositError;

    if (existingDeposits && existingDeposits.length > 0) {
      // Update existing deposit with receipt information
      console.log('📝 Updating existing deposit record:', existingDeposits[0].id);
      const existingDeposit = existingDeposits[0];

      const { data: updatedDeposit, error: updateError } = await supabase
        .from('deposits')
        .update({
          transaction_hash: transactionHash,
          request_metadata: {
            ...existingDeposit.request_metadata,
            receiptUrl: receiptPath,
            accountNumber: validatedData.accountNumber,
            accountName: validatedData.accountName,
            originalAmount: depositAmount,
            originalCurrency: originalCurrency,
            conversionRate: conversionRate,
            submittedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDeposit.id)
        .select()
        .single();

      deposit = updatedDeposit;
      depositError = updateError;

      if (!updateError) {
        console.log('✅ Existing deposit updated with receipt:', updatedDeposit);
      }
    } else {
      // Create new deposit record if none exists
      console.log('💾 Creating new deposit record...');
      const { data: newDeposit, error: createError } = await supabase
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

      deposit = newDeposit;
      depositError = createError;
    }

    if (depositError) {
      console.error('❌ Error processing deposit:', depositError);
      return NextResponse.json(
        { success: false, message: 'Failed to process deposit record' },
        { status: 500 }
      );
    }

    console.log('✅ Deposit processed successfully:', deposit);

    return NextResponse.json({
      success: true,
      message: existingDeposits && existingDeposits.length > 0
        ? 'Receipt uploaded successfully - deposit updated and awaiting admin approval'
        : 'Manual deposit request created successfully - awaiting admin approval',
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
    console.error('❌ Error details:', {
      name: error?.constructor?.name,
      message: error?.message,
      stack: error?.stack,
      code: error?.code
    });

    // Handle specific error types
    if (error instanceof z.ZodError) {
      console.error('❌ Zod validation error:', error.issues);
      return NextResponse.json(
        { success: false, message: `Validation error: ${error.issues[0]?.message}` },
        { status: 400 }
      );
    }

    // Handle Supabase/Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as any).code;
      console.error('❌ Database error code:', errorCode);
      if (errorCode?.startsWith?.('P2')) {
        return NextResponse.json(
          { success: false, message: `Database error: ${errorCode}` },
          { status: 400 }
        );
      }
    }

    // Return more detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Returning internal server error:', errorMessage);

    return NextResponse.json(
      { success: false, message: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Test endpoint
export async function GET() {
  console.log('🧪 GET /api/deposits/manual test endpoint called');

  // Test Supabase connection
  try {
    const { data, error } = await supabase.from('deposits').select('count').limit(1);
    console.log('✅ Supabase connection test:', { data, error });
  } catch (testError) {
    console.error('❌ Supabase connection test failed:', testError);
  }

  return NextResponse.json({
    success: true,
    message: 'Manual deposits API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
  });
}
