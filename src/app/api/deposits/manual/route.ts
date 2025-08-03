import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

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
    const formData = await request.formData();

    const userEmail = formData.get('userEmail') as string;
    const amount = formData.get('amount') as string;
    const currency = formData.get('currency') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const network = formData.get('network') as string;
    const accountNumber = formData.get('accountNumber') as string;
    const accountName = formData.get('accountName') as string;
    const receiptFile = formData.get('receipt') as File;



    // Validate required fields
    if (!userEmail || !amount || !currency || !paymentMethod || !receiptFile) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid deposit amount' },
        { status: 400 }
      );
    }

    // Validate minimum amount based on payment method
    if (paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon') {
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
    if (receiptFile) {
      const bytes = await receiptFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create unique filename
      const fileExtension = receiptFile.name.split('.').pop() || 'jpg';
      const fileName = `${uuidv4()}.${fileExtension}`;
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'receipts');
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
      
      // Save file
      const filePath = join(uploadsDir, fileName);
      await writeFile(filePath, buffer);
      receiptPath = `/uploads/receipts/${fileName}`;
    }

    // Handle currency conversion
    let usdAmount: number;
    let originalCurrency: string;
    let conversionRate: number;

    if (paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon') {
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

    // Create deposit record


    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_email: userEmail,
        transaction_hash: `manual_${uuidv4()}`,
        method_id: paymentMethod,
        method_name: (paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon')
          ? `USDT (${paymentMethod.split('-')[1].toUpperCase()})`
          : paymentMethod.toUpperCase(),
        amount: usdAmount, // Store in USD
        currency: 'USD', // Final currency
        network: network,
        deposit_address: accountNumber, // The address/account number where payment was sent
        status: 'pending',
        request_metadata: {
          receiptUrl: receiptPath,
          accountNumber,
          accountName,
          paymentMethod,
          originalAmount: depositAmount,
          originalCurrency: originalCurrency,
          conversionRate: conversionRate,
          isManualDeposit: true
        },
        admin_notes: (paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon')
          ? `Manual USDT (${paymentMethod.split('-')[1].toUpperCase()}) deposit - requires blockchain verification`
          : `Manual ${paymentMethod.toUpperCase()} deposit - requires verification`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (depositError) {
      console.error('Error creating deposit:', depositError);
      return NextResponse.json(
        { success: false, message: 'Failed to create deposit record' },
        { status: 500 }
      );
    }

    // Create notification for admin
    await supabase
      .from('notifications')
      .insert({
        user_email: 'admin@ticglobal.com', // Admin email
        title: 'New Manual Deposit Request',
        message: `New ${paymentMethod.toUpperCase()} deposit of ₱${depositAmount.toLocaleString()} (≈$${usdAmount.toFixed(2)}) from ${userEmail}`,
        type: 'admin',
        priority: 'high',
        metadata: {
          depositId: deposit.id,
          userEmail,
          amount: usdAmount,
          originalAmount: depositAmount,
          paymentMethod,
          receiptUrl: receiptPath
        }
      });

    // Create notification for user
    await supabase
      .from('notifications')
      .insert({
        user_email: userEmail,
        title: 'Deposit Request Submitted',
        message: (paymentMethod === 'usdt-trc20' || paymentMethod === 'usdt-bep20' || paymentMethod === 'usdt-polygon')
          ? `Your USDT (${paymentMethod.split('-')[1].toUpperCase()}) deposit request of $${depositAmount.toLocaleString()} has been submitted and is pending verification.`
          : `Your ${paymentMethod.toUpperCase()} deposit request of ₱${depositAmount.toLocaleString()} has been submitted and is pending verification.`,
        type: 'deposit',
        priority: 'medium',
        metadata: {
          depositId: deposit.id,
          amount: usdAmount,
          originalAmount: depositAmount,
          paymentMethod,
          status: 'pending'
        }
      });

    return NextResponse.json({
      success: true,
      message: 'Manual deposit request created successfully',
      deposit: {
        id: deposit.id,
        amount: usdAmount,
        originalAmount: depositAmount,
        currency: 'USD',
        originalCurrency: originalCurrency,
        status: 'pending',
        paymentMethod,
        receiptUrl: receiptPath
      }
    });

  } catch (error) {
    console.error('Error in manual deposit API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
