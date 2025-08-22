import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get current GIC token pricing
export async function GET(request: NextRequest) {
  try {
    // Get current GIC pricing
    const { data: pricing, error: pricingError } = await supabaseAdmin
      .from('current_gic_pricing')
      .select('*')
      .single();

    if (pricingError) {
      console.error('Error fetching GIC pricing:', pricingError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch GIC pricing',
        details: pricingError.message
      }, { status: 500 });
    }

    // Calculate example conversions
    const exampleConversions = {
      gic_to_usd: {
        '100_gic': (100 * parseFloat(pricing.sell_rate_usd || '0')).toFixed(4),
        '500_gic': (500 * parseFloat(pricing.sell_rate_usd || '0')).toFixed(4),
        '1000_gic': (1000 * parseFloat(pricing.sell_rate_usd || '0')).toFixed(4)
      },
      usd_to_gic: {
        '100_usd': (100 / parseFloat(pricing.buy_rate_usd || '1')).toFixed(4),
        '500_usd': (500 / parseFloat(pricing.buy_rate_usd || '1')).toFixed(4),
        '1000_usd': (1000 / parseFloat(pricing.buy_rate_usd || '1')).toFixed(4)
      },
      peso_examples: {
        buy_example: `1 GIC costs ${pricing.buy_rate_pesos} pesos = $${pricing.buy_rate_usd} USD`,
        sell_example: `1 GIC sells for ${pricing.sell_rate_pesos} pesos = $${pricing.sell_rate_usd} USD`,
        spread: `${parseFloat(pricing.buy_rate_pesos || '0') - parseFloat(pricing.sell_rate_pesos || '0')} peso spread`
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        current_pricing: pricing,
        conversions: exampleConversions,
        explanation: {
          buy_rate: `Users receive GIC tokens at ${pricing.buy_rate_pesos} pesos per GIC ($${pricing.buy_rate_usd} USD)`,
          sell_rate: `Users can sell GIC tokens at ${pricing.sell_rate_pesos} pesos per GIC ($${pricing.sell_rate_usd} USD)`,
          peso_to_usd: `Exchange rate: 1 peso = $${pricing.peso_to_usd_rate} USD`,
          usage: 'Buy rate used for rank bonuses, sell rate used for withdrawals/conversions'
        }
      }
    });

  } catch (error) {
    console.error('Error in GIC pricing GET:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Update GIC token pricing (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { 
      buy_rate_pesos, 
      sell_rate_pesos, 
      peso_to_usd_rate, 
      admin_key 
    } = await request.json();

    // Verify admin access
    const expectedAdminKey = process.env.ADMIN_API_KEY || 'admin-secret-key';
    if (admin_key !== expectedAdminKey) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Invalid admin key'
      }, { status: 401 });
    }

    // Validate input
    if (!buy_rate_pesos || !sell_rate_pesos || !peso_to_usd_rate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: buy_rate_pesos, sell_rate_pesos, peso_to_usd_rate'
      }, { status: 400 });
    }

    const buyRate = parseFloat(buy_rate_pesos);
    const sellRate = parseFloat(sell_rate_pesos);
    const pesoUsdRate = parseFloat(peso_to_usd_rate);

    if (isNaN(buyRate) || isNaN(sellRate) || isNaN(pesoUsdRate) || 
        buyRate <= 0 || sellRate <= 0 || pesoUsdRate <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid rates. All rates must be positive numbers'
      }, { status: 400 });
    }

    if (buyRate <= sellRate) {
      return NextResponse.json({
        success: false,
        error: 'Buy rate must be higher than sell rate'
      }, { status: 400 });
    }

    // Update GIC pricing using database function
    const { data, error } = await supabaseAdmin
      .rpc('update_gic_pricing', {
        new_buy_rate_pesos: buyRate,
        new_sell_rate_pesos: sellRate,
        new_peso_to_usd_rate: pesoUsdRate
      });

    if (error) {
      console.error('Error updating GIC pricing:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update GIC pricing',
        details: error.message
      }, { status: 500 });
    }

    // Get updated pricing
    const { data: updatedPricing, error: fetchError } = await supabaseAdmin
      .from('current_gic_pricing')
      .select('*')
      .single();

    return NextResponse.json({
      success: true,
      message: 'GIC pricing updated successfully',
      data: {
        previous_rates: 'Updated',
        new_pricing: updatedPricing,
        impact: {
          buy_rate_usd: (buyRate * pesoUsdRate).toFixed(4),
          sell_rate_usd: (sellRate * pesoUsdRate).toFixed(4),
          spread_pesos: buyRate - sellRate,
          spread_usd: ((buyRate - sellRate) * pesoUsdRate).toFixed(4)
        },
        examples: {
          rank_bonus_conversion: `$100 USD rank bonus → ${(100 / (buyRate * pesoUsdRate)).toFixed(4)} GIC tokens`,
          withdrawal_value: `1000 GIC tokens → $${(1000 * sellRate * pesoUsdRate).toFixed(2)} USD`
        }
      }
    });

  } catch (error) {
    console.error('Error in GIC pricing POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Test GIC conversions
export async function PUT(request: NextRequest) {
  try {
    const { conversion_type, amount } = await request.json();

    if (!conversion_type || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: conversion_type and amount'
      }, { status: 400 });
    }

    const testAmount = parseFloat(amount);
    if (isNaN(testAmount) || testAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid amount. Must be a positive number'
      }, { status: 400 });
    }

    let conversionResult;

    if (conversion_type === 'gic_to_usd') {
      // Test GIC to USD conversion (selling)
      const { data: usdValue, error } = await supabaseAdmin
        .rpc('convert_gic_to_usd', {
          gic_amount_param: testAmount
        });

      if (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to convert GIC to USD',
          details: error.message
        }, { status: 500 });
      }

      conversionResult = {
        input: `${testAmount} GIC tokens`,
        output: `$${parseFloat(usdValue).toFixed(4)} USD`,
        rate_used: 'sell_rate (60 pesos per GIC)',
        calculation: `${testAmount} GIC × sell rate = $${parseFloat(usdValue).toFixed(4)} USD`
      };

    } else if (conversion_type === 'usd_to_gic') {
      // Test USD to GIC conversion (buying/receiving bonuses)
      const { data: gicAmount, error } = await supabaseAdmin
        .rpc('convert_usd_to_gic', {
          usd_amount_param: testAmount
        });

      if (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to convert USD to GIC',
          details: error.message
        }, { status: 500 });
      }

      conversionResult = {
        input: `$${testAmount} USD`,
        output: `${parseFloat(gicAmount).toFixed(4)} GIC tokens`,
        rate_used: 'buy_rate (63 pesos per GIC)',
        calculation: `$${testAmount} USD ÷ buy rate = ${parseFloat(gicAmount).toFixed(4)} GIC`
      };

    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid conversion_type. Use "gic_to_usd" or "usd_to_gic"'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'GIC conversion test completed',
      data: {
        conversion_type,
        result: conversionResult,
        pricing_info: {
          note: 'Buy rate (63 pesos) used for rank bonuses, sell rate (60 pesos) used for withdrawals'
        }
      }
    });

  } catch (error) {
    console.error('Error in GIC conversion test:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
