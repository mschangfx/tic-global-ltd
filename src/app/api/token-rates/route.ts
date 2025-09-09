import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get current token exchange rates
export async function GET(request: NextRequest) {
  try {
    // Get current token exchange rates
    const { data: rates, error: ratesError } = await supabaseAdmin
      .from('current_token_rates')
      .select('*')
      .order('token_symbol');

    if (ratesError) {
      console.error('Error fetching token rates:', ratesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch token rates',
        details: ratesError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        rates: rates || [],
        explanation: {
          tic_rate: rates?.find(r => r.token_symbol === 'TIC')?.usd_rate || 1.00,
          gic_rate: rates?.find(r => r.token_symbol === 'GIC')?.usd_rate || 1.00,
          conversion_example: {
            bronze_bonus_usd: 690,
            tic_usd_split: 345,
            gic_usd_split: 345,
            tic_tokens: 345 / (rates?.find(r => r.token_symbol === 'TIC')?.usd_rate || 1.00),
            gic_tokens: 345 / (rates?.find(r => r.token_symbol === 'GIC')?.usd_rate || 1.00)
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in token rates GET:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Update token exchange rates (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { token_symbol, usd_rate, admin_key } = await request.json();

    // Verify admin access
    const expectedAdminKey = process.env.ADMIN_API_KEY || 'admin-secret-key';
    if (admin_key !== expectedAdminKey) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Invalid admin key'
      }, { status: 401 });
    }

    // Validate input
    if (!token_symbol || !usd_rate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: token_symbol and usd_rate'
      }, { status: 400 });
    }

    if (!['TIC', 'GIC'].includes(token_symbol.toUpperCase())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token symbol. Must be TIC or GIC'
      }, { status: 400 });
    }

    const rate = parseFloat(usd_rate);
    if (isNaN(rate) || rate <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid USD rate. Must be a positive number'
      }, { status: 400 });
    }

    // Update token exchange rate using database function
    const { data, error } = await supabaseAdmin
      .rpc('update_token_exchange_rate', {
        token_symbol_param: token_symbol.toUpperCase(),
        new_usd_rate_param: rate
      });

    if (error) {
      console.error('Error updating token rate:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update token rate',
        details: error.message
      }, { status: 500 });
    }

    // Get updated rates
    const { data: updatedRates, error: fetchError } = await supabaseAdmin
      .from('current_token_rates')
      .select('*')
      .order('token_symbol');

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${token_symbol} exchange rate to $${rate}`,
      data: {
        updated_token: token_symbol.toUpperCase(),
        new_rate: rate,
        previous_rate: 'Updated',
        current_rates: updatedRates || [],
        impact_example: {
          bronze_bonus_usd: 690,
          usd_split: 345,
          [`${token_symbol.toLowerCase()}_tokens`]: 345 / rate,
          explanation: `$345 USD will now convert to ${(345 / rate).toFixed(4)} ${token_symbol.toUpperCase()} tokens`
        }
      }
    });

  } catch (error) {
    console.error('Error in token rates POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Test USD-to-token conversion
export async function PUT(request: NextRequest) {
  try {
    const { usd_amount, token_symbol } = await request.json();

    if (!usd_amount || !token_symbol) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: usd_amount and token_symbol'
      }, { status: 400 });
    }

    const amount = parseFloat(usd_amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid USD amount. Must be a positive number'
      }, { status: 400 });
    }

    // Test conversion using database function
    const { data: tokenAmount, error } = await supabaseAdmin
      .rpc('convert_usd_to_tokens', {
        usd_amount_param: amount,
        token_symbol_param: token_symbol.toUpperCase()
      });

    if (error) {
      console.error('Error testing conversion:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to test conversion',
        details: error.message
      }, { status: 500 });
    }

    // Get current rate for reference
    const { data: currentRate, error: rateError } = await supabaseAdmin
      .rpc('get_token_exchange_rate', {
        token_symbol_param: token_symbol.toUpperCase()
      });

    return NextResponse.json({
      success: true,
      message: 'USD-to-token conversion test completed',
      data: {
        input: {
          usd_amount: amount,
          token_symbol: token_symbol.toUpperCase()
        },
        conversion: {
          token_amount: tokenAmount,
          exchange_rate: currentRate || 1.00,
          calculation: `$${amount} ÷ $${currentRate || 1.00} = ${tokenAmount} ${token_symbol.toUpperCase()}`
        },
        rank_bonus_examples: {
          bronze: {
            total_usd: 690,
            split_usd: 345,
            tokens: 345 / (currentRate || 1.00)
          },
          silver: {
            total_usd: 2484,
            split_usd: 1242,
            tokens: 1242 / (currentRate || 1.00)
          },
          gold: {
            total_usd: 4830,
            split_usd: 2415,
            tokens: 2415 / (currentRate || 1.00)
          }
        }
      }
    });

  } catch (error) {
    console.error('Error in token conversion test:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}
