-- COMPLETE FIX: Allow payment transactions and add missing columns
-- Run these commands to fix the payment issue

-- 1. Remove the old constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

-- 2. Add the new constraint that includes 'payment'
ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check
    CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment'));

-- 3. Add updated_at column if it doesn't exist
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Add other potentially missing columns that the payment system might need
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS request_metadata JSONB DEFAULT '{}';

-- 5. Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger for transactions table
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- That's it! Your payment system should now work.
