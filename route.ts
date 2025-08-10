import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering and use Node.js runtime for file handling
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const userEmail = formData.get('userEmail') as string;
    const amount = formData.get('amount') as string;
    const currency = formData.get('currency') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const network = formData.get('network') as string;
    const accountNumber = formData.get('accountNumber') as string;
    const accountName = formData.get('accountName') as string;
    const receiptFile = formData.get('receipt') as File;
    const depositId = formData.get('depositId') as string;

    console.log('📊 Raw data extracted:', {
      userEmail, amount, currency, paymentMethod, network, accountNumber, accountName, hasReceipt: !!receiptFile, depositId
    });

    // Validate required fields
    if (!userEmail || !amount || !currency || !paymentMethod || !accountNumber || !accountName) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(receiptFile.type)) {
      return NextResponse.json(
        { success: false, message: 'Receipt must be an image (JPEG, PNG, WebP) or PDF file' },
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

    // Save receipt file to Supabase Storage
    let receiptPath = '';
    try {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (receiptFile.size > maxSize) {
        return NextResponse.json(
          { success: false, message: 'Receipt file size must be less than 5MB' },
          { status: 400 }
        );
      }

      // Create unique filename
      const fileExtension = receiptFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeName = receiptFile.name.replace(/[^\w.\-]+/g, "_");
      const fileName = `${Date.now()}_${uuidv4()}_${safeName}`;
      const filePath = `receipts/${fileName}`;

      console.log('📁 Uploading receipt to Supabase Storage:', filePath);

      // Convert file to buffer
      const bytes = await receiptFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Supabase Storage
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
      return NextResponse.json(
        { success: false, message: 'Failed to save receipt file' },
        { status: 500 }
      );
    }

    // Calculate USD amount for storage
    let usdAmount = depositAmount;
    let originalCurrency = currency;
    let conversionRate = 1;

    if (paymentMethod === 'usdt_trc20' || paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon') {
      // USDT is already in USD
      usdAmount = depositAmount;
      originalCurrency = 'USD';
      conversionRate = 1;
    } else {
      // Convert PHP to USD (approximate rate: 1 PHP = 0.018 USD)
      usdAmount = depositAmount * 0.018;
      originalCurrency = currency;
      conversionRate = 0.018;
    }

    console.log('💱 Currency conversion:', { depositAmount, usdAmount, originalCurrency, conversionRate });

    // Create deposit record in Supabase
    const finalDepositId = depositId || uuidv4();
    const transactionHash = `manual_${uuidv4()}`;

    try {
      let deposit;
      let depositError;

      if (depositId) {
        // Update existing deposit with receipt information
        console.log('📝 Updating existing deposit record:', depositId);

        const { data: updatedDeposit, error: updateError } = await supabase
          .from('deposits')
          .update({
            transaction_hash: transactionHash,
            receipt_url: receiptPath,
            account_number: accountNumber,
            account_name: accountName,
            payment_method: paymentMethod,
            request_metadata: {
              receiptUrl: receiptPath,
              accountNumber: accountNumber,
              accountName: accountName,
              originalAmount: depositAmount,
              originalCurrency: originalCurrency,
              conversionRate: conversionRate,
              submittedAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', depositId)
          .select()
          .single();

        deposit = updatedDeposit;
        depositError = updateError;

        if (!updateError) {
          console.log('✅ Existing deposit updated with receipt:', updatedDeposit);
        } else {
          console.error('❌ Failed to update existing deposit:', updateError);
        }
      } else {
        // Create new deposit record (original working behavior)
        console.log('💾 Creating new deposit record...');
        const { data: newDeposit, error: createError } = await supabase
          .from('deposits')
          .insert({
            id: finalDepositId,
            user_email: userEmail,
            transaction_hash: transactionHash,
            method_id: paymentMethod,
            method_name: (paymentMethod === 'usdt_trc20' || paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon')
              ? `USDT (${paymentMethod.includes('_') ? paymentMethod.split('_')[1].toUpperCase() : paymentMethod.split('-')[1].toUpperCase()})`
              : paymentMethod.toUpperCase(),
            amount: usdAmount,
            currency: 'USD',
            network: network || 'Manual',
            deposit_address: accountNumber,
            status: 'pending',
            receipt_url: receiptPath,
            account_number: accountNumber,
            account_name: accountName,
            payment_method: paymentMethod,
            request_metadata: {
              receiptUrl: receiptPath,
              accountNumber: accountNumber,
              accountName: accountName,
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
        message: depositId
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
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to create deposit record' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ POST /api/deposits/manual failed:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
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