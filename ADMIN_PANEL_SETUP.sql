-- =====================================================
-- TIC Global Admin Panel - Database Setup
-- =====================================================

-- Create admin audit logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_email);

-- Create refund withdrawal function
CREATE OR REPLACE FUNCTION refund_withdrawal_amount(withdrawal_id_param UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_amount NUMERIC;
  v_user_email TEXT;
  v_method TEXT;
  v_currency TEXT;
BEGIN
  -- Get withdrawal details
  SELECT amount, user_email, method, currency
  INTO v_amount, v_user_email, v_method, v_currency
  FROM withdrawal_requests
  WHERE id = withdrawal_id_param
  FOR UPDATE;

  -- Check if withdrawal exists
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Withdrawal not found');
  END IF;

  -- Refund to user's main wallet (total balance)
  UPDATE wallets
  SET 
    total_balance = total_balance + v_amount,
    updated_at = NOW()
  WHERE user_email = v_user_email;

  -- Insert transaction record for the refund
  INSERT INTO wallet_transactions (
    user_email,
    transaction_type,
    amount,
    currency,
    description,
    reference_id,
    status,
    created_at
  ) VALUES (
    v_user_email,
    'refund',
    v_amount,
    v_currency,
    'Withdrawal refund - ' || v_method || ' withdrawal rejected by admin',
    withdrawal_id_param::TEXT,
    'completed',
    NOW()
  );

  -- Return success with refunded amount
  RETURN json_build_object(
    'success', true,
    'refunded', v_amount,
    'user_email', v_user_email,
    'method', v_method
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'error', 'Refund failed: ' || SQLERRM
    );
END $$;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION refund_withdrawal_amount(UUID) TO service_role;

-- =====================================================
-- Verification Queries (Run these to test)
-- =====================================================

-- Test audit table
-- SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 5;

-- Test refund function (replace with actual withdrawal ID)
-- SELECT refund_withdrawal_amount('your-withdrawal-id-here');

-- Check pending transactions
-- SELECT 
--   'deposit' as type, id, user_email, amount, method_name as method, created_at, status
-- FROM deposits 
-- WHERE status = 'pending'
-- UNION ALL
-- SELECT 
--   'withdrawal' as type, id, user_email, amount, method, created_at, status
-- FROM withdrawal_requests 
-- WHERE status = 'pending'
-- ORDER BY created_at DESC;
