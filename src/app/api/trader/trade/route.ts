import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST - Process GIC token trade
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, tradeType, gicAmount, usdAmount } = body;

    if (!userEmail || !tradeType || !gicAmount || !usdAmount) {
      return NextResponse.json(
        { error: 'All fields are required: userEmail, tradeType, gicAmount, usdAmount' },
        { status: 400 }
      );
    }

    if (tradeType !== 'buy' && tradeType !== 'sell') {
      return NextResponse.json(
        { error: 'Trade type must be either "buy" or "sell"' },
        { status: 400 }
      );
    }

    if (gicAmount <= 0 || usdAmount <= 0) {
      return NextResponse.json(
        { error: 'Amounts must be greater than zero' },
        { status: 400 }
      );
    }

    console.log('Processing GIC trade:', { userEmail, tradeType, gicAmount, usdAmount });

    // Call the database function to process the trade
    const { data, error } = await supabaseAdmin
      .rpc('process_gic_trade', {
        user_email_param: userEmail,
        trade_type_param: tradeType,
        gic_amount_param: parseFloat(gicAmount),
        usd_amount_param: parseFloat(usdAmount)
      });

    if (error) {
      console.error('Error processing GIC trade:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to process trade',
          details: error.message
        },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        {
          success: false,
          error: data.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction_id: data.transaction_id,
      trade_type: data.trade_type,
      gic_amount: data.gic_amount,
      usd_amount: data.usd_amount,
      price_per_token: data.price_per_token,
      message: data.message
    });

  } catch (error) {
    console.error('Error in GIC trade API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
