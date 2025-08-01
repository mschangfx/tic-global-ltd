import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// POST - Add test commission earnings for development/testing
export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    let userEmail = session?.user?.email;

    // If no NextAuth session, try Supabase auth
    if (!userEmail) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email;
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      referred_email, 
      commission_type = 'purchase', 
      commission_amount, 
      commission_rate = 0.1 
    } = body;

    // If no specific amount provided, generate a random amount
    const amount = commission_amount || (Math.random() * 50 + 10); // $10-$60 random

    // Use the database function to add commission earning
    const { data, error } = await supabaseAdmin
      .rpc('add_commission_earning', {
        referrer_email_param: userEmail,
        referred_email_param: referred_email || `test-user-${Date.now()}@example.com`,
        commission_type_param: commission_type,
        commission_amount_param: amount,
        commission_rate_param: commission_rate,
        source_transaction_id_param: null,
        source_amount_param: amount / commission_rate,
        description_param: `Test commission - ${commission_type} from ${referred_email || 'test user'}`
      });

    if (error) {
      console.error('Error adding test commission:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to add commission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test commission of $${amount.toFixed(2)} added to partner wallet`,
      data: {
        referrer_email: userEmail,
        referred_email: referred_email || `test-user-${Date.now()}@example.com`,
        commission_type,
        commission_amount: amount,
        commission_rate
      }
    });

  } catch (error) {
    console.error('Error in test commission API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Add multiple test commissions for comprehensive testing
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    let userEmail = session?.user?.email;

    // If no NextAuth session, try Supabase auth
    if (!userEmail) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email;
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const testCommissions = [
      {
        referred_email: 'alice@example.com',
        commission_type: 'signup',
        commission_amount: 25.00,
        commission_rate: 0.05,
        description: 'New user signup bonus'
      },
      {
        referred_email: 'bob@example.com',
        commission_type: 'purchase',
        commission_amount: 45.50,
        commission_rate: 0.10,
        description: 'VIP plan purchase commission'
      },
      {
        referred_email: 'charlie@example.com',
        commission_type: 'activity',
        commission_amount: 15.75,
        commission_rate: 0.08,
        description: 'Trading activity commission'
      },
      {
        referred_email: 'diana@example.com',
        commission_type: 'purchase',
        commission_amount: 32.25,
        commission_rate: 0.10,
        description: 'Starter plan purchase commission'
      },
      {
        referred_email: 'eve@example.com',
        commission_type: 'signup',
        commission_amount: 20.00,
        commission_rate: 0.05,
        description: 'New user signup bonus'
      }
    ];

    const results = [];
    let totalAdded = 0;

    for (const commission of testCommissions) {
      try {
        const { data, error } = await supabaseAdmin
          .rpc('add_commission_earning', {
            referrer_email_param: userEmail,
            referred_email_param: commission.referred_email,
            commission_type_param: commission.commission_type,
            commission_amount_param: commission.commission_amount,
            commission_rate_param: commission.commission_rate,
            source_transaction_id_param: null,
            source_amount_param: commission.commission_amount / commission.commission_rate,
            description_param: commission.description
          });

        if (error) {
          results.push({ ...commission, status: 'error', error: error.message });
        } else {
          results.push({ ...commission, status: 'success' });
          totalAdded += commission.commission_amount;
        }
      } catch (err) {
        results.push({ ...commission, status: 'error', error: 'Unexpected error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Added ${results.filter(r => r.status === 'success').length} test commissions totaling $${totalAdded.toFixed(2)}`,
      data: {
        total_added: totalAdded,
        results,
        user_email: userEmail
      }
    });

  } catch (error) {
    console.error('Error in bulk test commission API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
