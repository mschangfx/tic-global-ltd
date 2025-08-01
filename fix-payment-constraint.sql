-- URGENT FIX: Allow 'payment' transaction type in transactions table
-- This fixes the constraint error preventing payment processing

-- Step 1: Drop the existing constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- Step 2: Add the updated constraint that includes 'payment'
ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check 
    CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment'));

-- Step 3: Verify the constraint was updated
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'transactions_transaction_type_check';

-- Step 4: Test that payment transactions can now be created
-- This is just a test query - don't actually run this insert
/*
INSERT INTO transactions (
    user_email, 
    transaction_type, 
    amount, 
    currency, 
    network, 
    wallet_address, 
    status
) VALUES (
    'test@example.com',
    'payment',
    10.00,
    'USD',
    'internal',
    'internal_payment',
    'pending'
);
*/

SELECT 'Payment constraint fix applied successfully!' as status;
