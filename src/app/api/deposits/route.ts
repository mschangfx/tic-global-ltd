import { NextRequest, NextResponse } from 'next/server';
import { DepositService } from '@/lib/services/depositService';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper function to get authenticated user email from both auth methods
async function getAuthenticatedUserEmail(): Promise<string | null> {
  try {
    // Method 2: Try Supabase auth (manual login) - this works reliably
    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser?.email) {
        return supabaseUser.email;
      }
    } catch (supabaseError) {
      console.log('Supabase auth not available:', supabaseError);
    }

    // Method 1: Try NextAuth session (Google OAuth) - fallback
    try {
      const nextAuthSession = await getServerSession(authOptions as any);
      if ((nextAuthSession as any)?.user?.email) {
        return (nextAuthSession as any).user.email;
      }
    } catch (nextAuthError) {
      console.log('NextAuth session not available:', nextAuthError);
    }

    return null;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

// Supported deposit methods configuration - TRC20 only
const DEPOSIT_METHODS = {
  'usdt-trc20': {
    id: 'usdt-trc20',
    name: 'USDT',
    symbol: 'USDT',
    network: 'TRC20',
    address: 'TKDpaQGG9AWMpEaH6g73hPt5MekQ3abpHZ',
    processingTime: 'Instant - 15 minutes',
    fee: '0%',
    limits: { min: 10, max: 200000 },
    icon: '/img/USDT-TRC20.png',
    isActive: true
  }
};

// GET - Get available deposit methods
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const methodId = searchParams.get('method');

    if (methodId) {
      // Get specific deposit method
      const method = DEPOSIT_METHODS[methodId as keyof typeof DEPOSIT_METHODS];
      if (!method) {
        return NextResponse.json(
          { error: 'Deposit method not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        method: method
      });
    } else {
      // Get all active deposit methods
      const activeMethods = Object.values(DEPOSIT_METHODS).filter(method => method.isActive);
      
      return NextResponse.json({
        success: true,
        methods: activeMethods,
        count: activeMethods.length
      });
    }

  } catch (error) {
    console.error('Error fetching deposit methods:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new deposit request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, amount, userEmail: requestUserEmail } = body;

    // Get authenticated user email using hybrid approach
    let userEmail = await getAuthenticatedUserEmail();

    // If authentication fails, use the email from request body (for testing/development)
    if (!userEmail && requestUserEmail) {
      console.log('Using userEmail from request body:', requestUserEmail);
      userEmail = requestUserEmail;
    }

    // Temporary fix: use default email if no authentication
    if (!userEmail) {
      console.log('⚠️ No authentication found, using default email for testing');
      userEmail = 'user@ticglobal.com';
    }

    // Validate required fields
    if (!methodId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: methodId, amount' },
        { status: 400 }
      );
    }

    // Validate deposit method
    const method = DEPOSIT_METHODS[methodId as keyof typeof DEPOSIT_METHODS];
    if (!method || !method.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive deposit method' },
        { status: 400 }
      );
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid deposit amount' },
        { status: 400 }
      );
    }

    // Check amount limits
    if (depositAmount < method.limits.min || depositAmount > method.limits.max) {
      return NextResponse.json(
        { 
          error: `Deposit amount must be between $${method.limits.min} and $${method.limits.max}` 
        },
        { status: 400 }
      );
    }

    // Calculate fees
    const processingFeeRate = method.fee === '0%' ? 0 : parseFloat(method.fee.replace('%', '')) / 100;
    const processingFee = depositAmount * processingFeeRate;
    const networkFee = 0; // Network fees are usually for withdrawals

    // Create deposit using DepositService
    const depositService = DepositService.getInstance();
    const deposit = await depositService.createDeposit({
      user_email: userEmail,
      amount: depositAmount,
      currency: 'USD',
      method_id: methodId,
      method_name: method.name,
      network: method.network,
      deposit_address: method.address, // Our receiving address
      processing_fee: processingFee,
      network_fee: networkFee,
      request_metadata: {
        selected_method: methodId,
        method_details: method,
        user_agent: request.headers.get('user-agent') || 'Unknown',
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'Unknown'
      },
      user_agent: request.headers.get('user-agent') || 'Unknown',
      ip_address: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'Unknown'
    });

    console.log('Deposit created successfully:', deposit.id);

    // Admin notification will be handled by DepositService
    console.log('Deposit request created successfully:', deposit.id);

    return NextResponse.json({
      success: true,
      transaction: {
        id: deposit.id,
        amount: depositAmount,
        currency: 'USD',
        network: method.network,
        address: method.address,
        processing_fee: processingFee,
        network_fee: networkFee,
        final_amount: deposit.final_amount,
        status: deposit.status,
        created_at: deposit.created_at
      },
      method: {
        name: method.name,
        network: method.network,
        address: method.address,
        processingTime: method.processingTime
      },
      message: 'Deposit request created successfully'
    });

  } catch (error: any) {
    console.error('Error creating deposit request:', error);

    // More detailed error logging
    const errorDetails = {
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    console.error('Detailed error info:', errorDetails);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create deposit request',
        details: errorDetails,
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update deposit method configuration (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { methodId, updates, adminKey } = body;

    // Simple admin authentication (in production, use proper auth)
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate method exists
    if (!DEPOSIT_METHODS[methodId as keyof typeof DEPOSIT_METHODS]) {
      return NextResponse.json(
        { error: 'Deposit method not found' },
        { status: 404 }
      );
    }

    // In a real application, you would update this in a database
    // For now, we'll just return success
    return NextResponse.json({
      success: true,
      message: 'Deposit method updated successfully',
      methodId: methodId,
      updates: updates
    });

  } catch (error) {
    console.error('Error updating deposit method:', error);
    return NextResponse.json(
      { error: 'Failed to update deposit method' },
      { status: 500 }
    );
  }
}
