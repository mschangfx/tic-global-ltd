import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TOKEN_PRICES } from '@/lib/constants/tokens';

export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { from_account, to_account, amount, description, metadata } = await request.json();

    // Validate required fields
    if (!from_account || !to_account || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: from_account, to_account, amount' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Transfer amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (from_account === to_account) {
      return NextResponse.json(
        { success: false, message: 'Cannot transfer to the same account' },
        { status: 400 }
      );
    }

    console.log(`🔄 Processing between-accounts transfer for ${userEmail}: ${amount} from ${from_account} to ${to_account}`);

    // Get current wallet balances
    console.log(`🔍 Fetching wallet for user: ${userEmail}`);

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('user_wallets')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    console.log(`🔍 Wallet fetch result:`, wallet);
    console.log(`🔍 Wallet fetch error:`, walletError);

    if (walletError || !wallet) {
      console.error('❌ Error fetching wallet:', walletError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch wallet data', error: walletError?.message },
        { status: 500 }
      );
    }

    // Get current balances for from and to accounts
    let fromBalance: number;
    let toBalance: number;

    // Handle special case for 'total' account (main wallet)
    if (from_account === 'total') {
      // Main wallet balance IS the total_balance field
      // This represents the main wallet balance directly
      fromBalance = parseFloat(wallet.total_balance || '0');
      console.log(`🔍 Getting main wallet balance: total_balance=${wallet.total_balance}, parsed=${fromBalance}`);
    } else {
      // Map account name to database field
      const balanceField = `${from_account}_balance`;
      fromBalance = parseFloat(wallet[balanceField] || '0');
      console.log(`🔍 Getting balance for ${from_account}: field=${balanceField}, value=${wallet[balanceField]}, parsed=${fromBalance}`);
    }

    if (to_account === 'total') {
      // Main wallet balance IS the total_balance field
      // This represents the main wallet balance directly
      toBalance = parseFloat(wallet.total_balance || '0');
      console.log(`🔍 Getting main wallet balance for destination: total_balance=${wallet.total_balance}, parsed=${toBalance}`);
    } else {
      // Map account name to database field
      const balanceField = `${to_account}_balance`;
      toBalance = parseFloat(wallet[balanceField] || '0');
      console.log(`🔍 Getting balance for ${to_account}: field=${balanceField}, value=${wallet[balanceField]}, parsed=${toBalance}`);
    }

    console.log(`💰 Current balances - ${from_account}: ${fromBalance}, ${to_account}: ${toBalance}`);

    // Validate account types and balances
    const validAccounts = ['total', 'tic', 'gic', 'staking', 'partner_wallet'];
    if (!validAccounts.includes(from_account) || !validAccounts.includes(to_account)) {
      console.error(`❌ Invalid account types: from=${from_account}, to=${to_account}`);
      return NextResponse.json(
        { success: false, message: `Invalid account types: ${from_account} or ${to_account}` },
        { status: 400 }
      );
    }

    // TRANSFER RESTRICTIONS:
    // 1. TIC, GIC, and Partner Wallet can ONLY transfer TO Main Wallet
    // 2. Only Main Wallet can transfer to other sub-wallets
    // 3. Only Main Wallet can transfer to other users (handled in separate API)

    const restrictedFromAccounts = ['tic', 'gic', 'partner_wallet'];
    const restrictedToAccounts = ['tic', 'gic', 'partner_wallet', 'staking'];

    // Rule 1: Sub-wallets can only transfer TO Main Wallet
    if (restrictedFromAccounts.includes(from_account) && to_account !== 'total') {
      const accountNames: Record<string, string> = {
        'tic': 'TIC Wallet',
        'gic': 'GIC Wallet',
        'partner_wallet': 'Partner Wallet'
      };
      console.error(`❌ Restricted transfer: ${from_account} can only transfer to Main Wallet`);
      return NextResponse.json(
        { success: false, message: `${accountNames[from_account]} can only transfer funds to Main Wallet. Other transfers are not allowed.` },
        { status: 400 }
      );
    }

    // Rule 2: Only Main Wallet can transfer TO sub-wallets
    if (restrictedToAccounts.includes(to_account) && from_account !== 'total') {
      const accountNames: Record<string, string> = {
        'tic': 'TIC Wallet',
        'gic': 'GIC Wallet',
        'partner_wallet': 'Partner Wallet',
        'staking': 'Staking Wallet'
      };
      const fromAccountName = from_account === 'tic' ? 'TIC Wallet' :
                             from_account === 'gic' ? 'GIC Wallet' :
                             from_account === 'partner_wallet' ? 'Partner Wallet' :
                             from_account === 'staking' ? 'Staking Wallet' : from_account;
      console.error(`❌ Restricted transfer: Only Main Wallet can transfer to ${to_account}`);
      return NextResponse.json(
        { success: false, message: `Only Main Wallet can transfer funds to ${accountNames[to_account]}. ${fromAccountName} cannot transfer to other sub-wallets.` },
        { status: 400 }
      );
    }

    console.log(`✅ Account validation passed: ${from_account} → ${to_account}`);

    // Log specific transfer scenarios for debugging
    if (from_account === 'tic' && to_account === 'total') {
      console.log(`🔄 TIC → Main Wallet transfer: TIC balance will decrease, Main wallet will increase`);
    } else if (from_account === 'gic' && to_account === 'total') {
      console.log(`🔄 GIC → Main Wallet transfer: GIC balance will decrease, Main wallet will increase`);
    } else if (from_account === 'partner_wallet' && to_account === 'total') {
      console.log(`🔄 Partner Wallet → Main Wallet transfer: Partner balance will decrease, Main wallet will increase`);
    } else if (from_account === 'total' && to_account === 'tic') {
      console.log(`🔄 Main Wallet → TIC transfer: Main wallet will decrease, TIC balance will increase`);
    } else if (from_account === 'total' && to_account === 'gic') {
      console.log(`🔄 Main Wallet → GIC transfer: Main wallet will decrease, GIC balance will increase`);
    } else if (from_account === 'total' && to_account === 'partner_wallet') {
      console.log(`🔄 Main Wallet → Partner Wallet transfer: Main wallet will decrease, Partner balance will increase`);
    } else {
      console.log(`🔄 Sub-account transfer: ${from_account} → ${to_account} (main wallet unchanged)`);
    }

    // Check if sufficient balance in from account
    if (fromBalance < amount) {
      return NextResponse.json(
        { success: false, message: `Insufficient balance in ${from_account}. Available: $${fromBalance.toFixed(2)}, Required: $${amount.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Calculate new balances with proper token conversion handling
    let newFromBalance: number;
    let newToBalance: number;
    let tokenAmountToDeduct: number = amount; // Default: same as USD amount

    // Handle token-to-USD conversions for TIC and GIC transfers
    if (from_account === 'tic' && to_account === 'total') {
      // Transferring FROM TIC TO Main Wallet
      // USD amount goes to main wallet, but we need to deduct TIC tokens
      tokenAmountToDeduct = amount / TOKEN_PRICES.TIC; // Convert USD to TIC tokens
      newFromBalance = fromBalance - tokenAmountToDeduct; // Deduct TIC tokens
      newToBalance = toBalance + amount; // Add USD to main wallet
      console.log(`🪙 TIC→Main: Deducting ${tokenAmountToDeduct.toFixed(3)} TIC tokens, Adding $${amount} to main wallet`);
    } else if (from_account === 'gic' && to_account === 'total') {
      // Transferring FROM GIC TO Main Wallet
      // USD amount goes to main wallet, but we need to deduct GIC tokens
      tokenAmountToDeduct = amount / TOKEN_PRICES.GIC; // Convert USD to GIC tokens
      newFromBalance = fromBalance - tokenAmountToDeduct; // Deduct GIC tokens
      newToBalance = toBalance + amount; // Add USD to main wallet
      console.log(`🪙 GIC→Main: Deducting ${tokenAmountToDeduct.toFixed(6)} GIC tokens, Adding $${amount} to main wallet`);
    } else if (from_account === 'total' && to_account === 'tic') {
      // Transferring FROM Main Wallet TO TIC
      // USD amount comes from main wallet, but we need to add TIC tokens
      const ticTokensToAdd = amount / TOKEN_PRICES.TIC; // Convert USD to TIC tokens
      newFromBalance = fromBalance - amount; // Deduct USD from main wallet
      newToBalance = toBalance + ticTokensToAdd; // Add TIC tokens
      console.log(`🪙 Main→TIC: Deducting $${amount} from main wallet, Adding ${ticTokensToAdd.toFixed(3)} TIC tokens`);
    } else if (from_account === 'total' && to_account === 'gic') {
      // Transferring FROM Main Wallet TO GIC
      // USD amount comes from main wallet, but we need to add GIC tokens
      const gicTokensToAdd = amount / TOKEN_PRICES.GIC; // Convert USD to GIC tokens
      newFromBalance = fromBalance - amount; // Deduct USD from main wallet
      newToBalance = toBalance + gicTokensToAdd; // Add GIC tokens
      console.log(`🪙 Main→GIC: Deducting $${amount} from main wallet, Adding ${gicTokensToAdd.toFixed(6)} GIC tokens`);
    } else if (from_account === 'partner_wallet' && to_account === 'total') {
      // Transferring FROM Partner Wallet TO Main Wallet
      // Both are USD amounts, direct transfer
      newFromBalance = fromBalance - amount; // Deduct USD from partner wallet
      newToBalance = toBalance + amount; // Add USD to main wallet
      console.log(`🤝 Partner→Main: Deducting $${amount} from Partner Wallet, Adding $${amount} to Main Wallet`);
    } else if (from_account === 'total' && to_account === 'partner_wallet') {
      // Transferring FROM Main Wallet TO Partner Wallet
      // Both are USD amounts, direct transfer
      newFromBalance = fromBalance - amount; // Deduct USD from main wallet
      newToBalance = toBalance + amount; // Add USD to partner wallet
      console.log(`🤝 Main→Partner: Deducting $${amount} from Main Wallet, Adding $${amount} to Partner Wallet`);
    } else if (from_account === 'staking' && to_account === 'total') {
      // Transferring FROM Staking Wallet TO Main Wallet
      // Both are USD amounts, direct transfer
      newFromBalance = fromBalance - amount; // Deduct USD from staking wallet
      newToBalance = toBalance + amount; // Add USD to main wallet
      console.log(`📈 Staking→Main: Deducting $${amount} from Staking Wallet, Adding $${amount} to Main Wallet`);
    } else if (from_account === 'total' && to_account === 'staking') {
      // Transferring FROM Main Wallet TO Staking Wallet
      // Both are USD amounts, direct transfer
      newFromBalance = fromBalance - amount; // Deduct USD from main wallet
      newToBalance = toBalance + amount; // Add USD to staking wallet
      console.log(`📈 Main→Staking: Deducting $${amount} from Main Wallet, Adding $${amount} to Staking Wallet`);
    } else {
      // Other transfers (Main Wallet to sub-accounts, or between unrestricted accounts)
      // Note: TIC, GIC, Partner Wallet are restricted to only transfer TO Main Wallet
      newFromBalance = fromBalance - amount;
      newToBalance = toBalance + amount;
      console.log(`🔄 Standard transfer: ${from_account} → ${to_account}, Amount: $${amount}`);
    }

    // Validate that we don't create negative balances
    if (newFromBalance < 0) {
      let tokenType: string;
      let precision: number;
      let requiredAmount: number;

      if (from_account === 'tic') {
        tokenType = 'TIC tokens';
        precision = 3;
        requiredAmount = tokenAmountToDeduct;
      } else if (from_account === 'gic') {
        tokenType = 'GIC tokens';
        precision = 6;
        requiredAmount = tokenAmountToDeduct;
      } else if (from_account === 'partner_wallet') {
        tokenType = 'Partner Wallet USD';
        precision = 2;
        requiredAmount = amount;
      } else if (from_account === 'staking') {
        tokenType = 'Staking Wallet USD';
        precision = 2;
        requiredAmount = amount;
      } else {
        tokenType = 'USD';
        precision = 2;
        requiredAmount = amount;
      }

      return NextResponse.json(
        { success: false, message: `Insufficient ${tokenType} balance. Required: ${requiredAmount.toFixed(precision)} ${tokenType.includes('USD') ? '' : tokenType.split(' ')[1]}, Available: ${fromBalance.toFixed(precision)} ${tokenType.includes('USD') ? '' : tokenType.split(' ')[1]}` },
        { status: 400 }
      );
    }

    console.log(`🔄 New balances - ${from_account}: ${newFromBalance}, ${to_account}: ${newToBalance}`);
    console.log(`🔍 Balance update details:`, {
      from_account,
      to_account,
      fromBalance,
      toBalance,
      newFromBalance,
      newToBalance,
      usdAmount: amount,
      tokenAmountToDeduct: from_account === 'tic' || from_account === 'gic' ? tokenAmountToDeduct : 'N/A'
    });

    // Prepare update object
    const updateData: any = {
      last_updated: new Date().toISOString()
    };

    // The key insight: total_balance represents the sum of ALL money (main + sub-accounts)
    // When transferring between accounts, total_balance should NEVER change
    // Only individual account balances change

    // Update the specific account balances
    // IMPORTANT: We must update the actual database fields for sub-accounts
    // Main wallet balance is calculated dynamically, but sub-account balances are stored

    if (from_account !== 'total') {
      // Transferring FROM a sub-account (TIC, GIC, Staking, Partner) - decrease that account's balance
      const fromField = `${from_account}_balance`;
      updateData[fromField] = newFromBalance;
      console.log(`🔄 Updating ${fromField} from ${fromBalance} to ${newFromBalance}`);
      console.log(`✅ FROM account update: ${from_account} balance ${fromBalance} → ${newFromBalance} (change: ${newFromBalance - fromBalance})`);
    }
    // If from_account === 'total', we don't update any sub-account field (main wallet is total_balance)

    if (to_account !== 'total') {
      // Transferring TO a sub-account (TIC, GIC, Staking, Partner) - increase that account's balance
      const toField = `${to_account}_balance`;
      updateData[toField] = newToBalance;
      console.log(`🔄 Updating ${toField} from ${toBalance} to ${newToBalance}`);
      console.log(`✅ TO account update: ${to_account} balance ${toBalance} → ${newToBalance} (change: ${newToBalance - toBalance})`);
    }
    // If to_account === 'total', we don't update any sub-account field (main wallet is total_balance)

    // CRITICAL: total_balance logic for between-account transfers
    // total_balance represents the main wallet balance directly
    // Sub-account balances (tic_balance, gic_balance, etc.) are separate fields
    // When transferring TO/FROM main wallet, total_balance must change
    // When transferring between sub-accounts only, total_balance stays the same

    const currentTotalBalance = parseFloat(wallet.total_balance || '0');

    if (from_account === 'total' && to_account !== 'total') {
      // Transferring FROM main wallet TO sub-account
      // Main wallet (total_balance) decreases, sub-account balance increases
      updateData.total_balance = currentTotalBalance - amount;
      console.log(`💰 Main→Sub transfer: total_balance ${currentTotalBalance} → ${updateData.total_balance} (decreased by ${amount})`);

    } else if (from_account !== 'total' && to_account === 'total') {
      // Transferring FROM sub-account TO main wallet
      // Sub-account balance decreases, main wallet (total_balance) increases
      updateData.total_balance = currentTotalBalance + amount;
      console.log(`💰 Sub→Main transfer: total_balance ${currentTotalBalance} → ${updateData.total_balance} (increased by ${amount})`);

    } else {
      // Transferring between sub-accounts only (e.g., TIC → GIC)
      // total_balance (main wallet) stays the same, only sub-account balances change
      updateData.total_balance = currentTotalBalance;
      console.log(`💰 Sub→Sub transfer: total_balance unchanged at ${currentTotalBalance}`);
    }

    console.log(`🔄 Updating wallet with data:`, JSON.stringify(updateData, null, 2));
    console.log(`🔍 Database update summary:`, {
      userEmail,
      from_account,
      to_account,
      amount,
      updateData,
      fieldsBeingUpdated: Object.keys(updateData)
    });

    // Update wallet balances
    console.log(`🔄 About to update database for user: ${userEmail}`);
    console.log(`🔄 Update query: UPDATE user_wallets SET ... WHERE user_email = '${userEmail}'`);

    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('user_wallets')
      .update(updateData)
      .eq('user_email', userEmail)
      .select(); // Add select to see what was updated

    console.log(`🔍 Database update result:`, updateResult);
    console.log(`🔍 Database update error:`, updateError);

    if (updateError) {
      console.error('❌ Error updating wallet balances:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update wallet balances', error: updateError.message },
        { status: 500 }
      );
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('❌ No rows were updated in the database');
      return NextResponse.json(
        { success: false, message: 'No wallet found to update' },
        { status: 404 }
      );
    }

    console.log(`✅ Wallet balances updated successfully`);

    // Add a small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 500));

    // Record the transaction in wallet_transactions table
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transactionData = {
      user_email: userEmail,
      transaction_id: transactionId,
      transaction_type: 'transfer_between_accounts',
      amount: amount,
      currency: 'USD',
      balance_before: fromBalance,
      balance_after: newFromBalance,
      description: description || `Transfer from ${from_account} to ${to_account}`,
      metadata: {
        ...metadata,
        from_account,
        to_account,
        from_balance_before: fromBalance,
        from_balance_after: newFromBalance,
        to_balance_before: toBalance,
        to_balance_after: newToBalance
      },
      created_at: new Date().toISOString()
    };

    console.log('🔄 Recording transaction with data:', JSON.stringify(transactionData, null, 2));

    const { data: insertedTransaction, error: transactionError } = await supabaseAdmin
      .from('wallet_transactions')
      .insert(transactionData)
      .select();

    if (transactionError) {
      console.error('❌ Error recording transaction:', transactionError);
      // Don't fail the transfer if transaction recording fails, just log it
    } else {
      console.log('✅ Transaction recorded successfully:', insertedTransaction);
    }

    console.log('✅ Between-accounts transfer completed successfully');
    console.log('📊 Final balance summary:', {
      userEmail,
      transfer_type: `${from_account} → ${to_account}`,
      amount,
      from_account_before: fromBalance,
      from_account_after: newFromBalance,
      to_account_before: toBalance,
      to_account_after: newToBalance,
      main_wallet_before: parseFloat(wallet.total_balance || '0'),
      main_wallet_after: updateData.total_balance,
      database_fields_updated: Object.keys(updateData),
      balance_verification: {
        from_change: newFromBalance - fromBalance,
        to_change: newToBalance - toBalance,
        main_change: updateData.total_balance - parseFloat(wallet.total_balance || '0'),
        expected_from_change: from_account === 'total' ? -amount : from_account !== 'total' ? -amount : 0,
        expected_to_change: to_account === 'total' ? amount : to_account !== 'total' ? amount : 0
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully transferred $${amount.toFixed(2)} from ${from_account} to ${to_account}`,
      data: {
        user_email: userEmail,
        from_account,
        to_account,
        amount,
        from_balance_before: fromBalance,
        from_balance_after: newFromBalance,
        to_balance_before: toBalance,
        to_balance_after: newToBalance,
        transaction_id: transactionId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in between-accounts transfer API:', error);
    const errorMessage = error instanceof Error ? (error as Error).message : 'Internal server error';
    return NextResponse.json(
      { success: false, message: errorMessage, error: error instanceof Error ? error.stack : String(error) },
      { status: 500 }
    );
  }
}
