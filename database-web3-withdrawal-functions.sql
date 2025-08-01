-- Web3 Withdrawal Processing Functions
-- Execute this in your Supabase SQL Editor

-- Function to process Web3 withdrawal requests
CREATE OR REPLACE FUNCTION process_web3_withdrawal(
  user_email_param TEXT,
  network_param TEXT,
  token_symbol_param TEXT,
  amount_param DECIMAL,
  to_address_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_balance DECIMAL;
  withdrawal_id UUID;
  transaction_hash TEXT;
  result JSON;
BEGIN
  -- Check if user has sufficient balance
  SELECT total_balance INTO user_balance
  FROM user_wallets
  WHERE user_email = user_email_param;

  IF user_balance IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User wallet not found'
    );
  END IF;

  IF user_balance < amount_param THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient balance'
    );
  END IF;

  -- Generate a mock transaction hash for now (in production, this would come from actual blockchain transaction)
  transaction_hash := 'tx_' || encode(gen_random_bytes(16), 'hex');

  -- Create withdrawal record
  INSERT INTO blockchain_withdrawals (
    user_email,
    network,
    token_symbol,
    amount,
    to_address,
    transaction_hash,
    status,
    created_at,
    updated_at
  ) VALUES (
    user_email_param,
    network_param,
    token_symbol_param,
    amount_param,
    to_address_param,
    transaction_hash,
    'broadcasted',
    NOW(),
    NOW()
  ) RETURNING id INTO withdrawal_id;

  -- Debit user wallet
  UPDATE user_wallets
  SET 
    total_balance = total_balance - amount_param,
    updated_at = NOW()
  WHERE user_email = user_email_param;

  -- Log the transaction
  INSERT INTO wallet_transactions (
    user_email,
    transaction_type,
    amount,
    currency,
    network,
    transaction_hash,
    status,
    created_at
  ) VALUES (
    user_email_param,
    'withdrawal',
    amount_param,
    token_symbol_param,
    network_param,
    transaction_hash,
    'completed',
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', withdrawal_id,
    'transaction_hash', transaction_hash,
    'message', 'Withdrawal processed successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error processing withdrawal: ' || SQLERRM
    );
END;
$$;

-- Function to get user's Web3 withdrawal history
CREATE OR REPLACE FUNCTION get_user_web3_withdrawals(
  user_email_param TEXT,
  limit_param INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  network TEXT,
  token_symbol TEXT,
  amount DECIMAL,
  to_address TEXT,
  transaction_hash TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bw.id,
    bw.network,
    bw.token_symbol,
    bw.amount,
    bw.to_address,
    bw.transaction_hash,
    bw.status,
    bw.created_at,
    bw.updated_at
  FROM blockchain_withdrawals bw
  WHERE bw.user_email = user_email_param
  ORDER BY bw.created_at DESC
  LIMIT limit_param;
END;
$$;

-- Function to update withdrawal status (for blockchain monitoring)
CREATE OR REPLACE FUNCTION update_withdrawal_status(
  transaction_hash_param TEXT,
  new_status_param TEXT,
  confirmations_param INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE blockchain_withdrawals
  SET 
    status = new_status_param,
    confirmations = COALESCE(confirmations_param, confirmations),
    updated_at = NOW()
  WHERE transaction_hash = transaction_hash_param;

  RETURN FOUND;
END;
$$;

-- Function to get withdrawal by transaction hash
CREATE OR REPLACE FUNCTION get_withdrawal_by_hash(
  transaction_hash_param TEXT
)
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  network TEXT,
  token_symbol TEXT,
  amount DECIMAL,
  to_address TEXT,
  transaction_hash TEXT,
  status TEXT,
  confirmations INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bw.id,
    bw.user_email,
    bw.network,
    bw.token_symbol,
    bw.amount,
    bw.to_address,
    bw.transaction_hash,
    bw.status,
    bw.confirmations,
    bw.created_at,
    bw.updated_at
  FROM blockchain_withdrawals bw
  WHERE bw.transaction_hash = transaction_hash_param;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION process_web3_withdrawal(TEXT, TEXT, TEXT, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_web3_withdrawals(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_withdrawal_status(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_withdrawal_by_hash(TEXT) TO authenticated;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION process_web3_withdrawal(TEXT, TEXT, TEXT, DECIMAL, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_web3_withdrawals(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION update_withdrawal_status(TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_withdrawal_by_hash(TEXT) TO service_role;
