import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// SIMPLE FIX: Delete all distributions with wrong amounts (over 100 TIC)
export async function POST(request: NextRequest) {
  try {
    console.log('🚨 SIMPLE FIX: Deleting all distributions with wrong amounts...');
    
    const currentTime = new Date().toISOString();
    
    // Step 1: Find all distributions with wrong amounts
    // VIP should be ~18.90 TIC, Starter should be ~1.37 TIC
    // Any amount over 50 TIC is definitely wrong
    const { data: wrongDistributions, error: findError } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .gt('token_amount', 50);

    if (findError) {
      throw new Error(`Failed to find wrong distributions: ${findError.message}`);
    }

    console.log(`🔍 Found ${wrongDistributions?.length || 0} distributions with wrong amounts`);

    if (!wrongDistributions || wrongDistributions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No wrong distributions found',
        deleted_count: 0,
        timestamp: currentTime
      });
    }

    // Step 2: Delete all wrong distributions
    const wrongIds = wrongDistributions.map(d => d.id);
    
    console.log(`🗑️ Deleting ${wrongIds.length} wrong distributions...`);
    
    const { error: deleteError } = await supabaseAdmin
      .from('token_distributions')
      .delete()
      .in('id', wrongIds);

    if (deleteError) {
      throw new Error(`Failed to delete wrong distributions: ${deleteError.message}`);
    }

    console.log(`✅ Successfully deleted ${wrongIds.length} wrong distributions`);

    // Step 3: Also delete any wallet transactions related to these wrong distributions
    const transactionIds = wrongDistributions
      .map(d => `daily_distribution_${d.user_email}_${d.distribution_date}`)
      .filter(id => id);

    if (transactionIds.length > 0) {
      console.log(`🔄 Checking for related wallet transactions...`);
      
      const { data: relatedTransactions, error: txFindError } = await supabaseAdmin
        .from('wallet_transactions')
        .select('*')
        .in('transaction_id', transactionIds);

      if (!txFindError && relatedTransactions && relatedTransactions.length > 0) {
        console.log(`🗑️ Deleting ${relatedTransactions.length} related wallet transactions...`);
        
        const { error: txDeleteError } = await supabaseAdmin
          .from('wallet_transactions')
          .delete()
          .in('transaction_id', transactionIds);

        if (txDeleteError) {
          console.warn(`⚠️ Warning: Failed to delete related transactions: ${txDeleteError.message}`);
        } else {
          console.log(`✅ Deleted ${relatedTransactions.length} related wallet transactions`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${wrongIds.length} wrong distributions`,
      deleted_count: wrongIds.length,
      deleted_distributions: wrongDistributions.map(d => ({
        id: d.id,
        user_email: d.user_email,
        amount: d.token_amount,
        date: d.distribution_date,
        plan: d.plan_id
      })),
      timestamp: currentTime
    });

  } catch (error) {
    console.error('❌ Simple fix failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Simple fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check for wrong distributions
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking for distributions with wrong amounts...');
    
    // Find all distributions with wrong amounts (over 50 TIC)
    const { data: wrongDistributions, error } = await supabaseAdmin
      .from('token_distributions')
      .select('*')
      .gt('token_amount', 50)
      .order('distribution_date', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to check distributions: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      wrong_distributions_found: wrongDistributions?.length || 0,
      distributions: wrongDistributions?.map(d => ({
        id: d.id,
        user_email: d.user_email,
        amount: d.token_amount,
        date: d.distribution_date,
        plan: d.plan_id,
        created_at: d.created_at
      })) || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Check failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
