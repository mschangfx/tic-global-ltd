import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST - Check trader eligibility and status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('Checking trader status for:', userEmail);

    // Call the database function to check trader eligibility
    const { data, error } = await supabaseAdmin
      .rpc('check_trader_eligibility', {
        user_email_param: userEmail
      });

    if (error) {
      console.error('Error checking trader eligibility:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to check trader status',
          details: error.message
        },
        { status: 500 }
      );
    }

    // Add has_activated_once field based on accounts_activated
    const statusWithActivationFlag = {
      ...data,
      has_activated_once: data.accounts_activated > 0 // If user has any activated accounts, they've used their activation
    };

    return NextResponse.json({
      success: true,
      status: statusWithActivationFlag
    });

  } catch (error) {
    console.error('Error in trader status API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? (error as Error).message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
