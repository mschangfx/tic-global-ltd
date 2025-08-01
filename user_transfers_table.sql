-- Create user_transfers table for tracking user-to-user transfers
CREATE TABLE IF NOT EXISTS user_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_email VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_wallet_address VARCHAR(255) NOT NULL,
    transfer_amount DECIMAL(15,8) NOT NULL,
    fee_amount DECIMAL(15,8) NOT NULL DEFAULT 0,
    total_deducted DECIMAL(15,8) NOT NULL,
    note TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_transfers_sender_email ON user_transfers(sender_email);
CREATE INDEX IF NOT EXISTS idx_user_transfers_recipient_email ON user_transfers(recipient_email);
CREATE INDEX IF NOT EXISTS idx_user_transfers_created_at ON user_transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_user_transfers_status ON user_transfers(status);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view transfers where they are sender or recipient
CREATE POLICY "Users can view their own transfers" ON user_transfers
    FOR SELECT USING (
        sender_email = current_setting('request.jwt.claims', true)::json->>'email' OR
        recipient_email = current_setting('request.jwt.claims', true)::json->>'email'
    );

-- Policy: Only authenticated users can insert transfers (handled by API)
CREATE POLICY "API can insert transfers" ON user_transfers
    FOR INSERT WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE user_transfers IS 'Stores user-to-user transfer transactions with fees';
COMMENT ON COLUMN user_transfers.sender_email IS 'Email of the user sending the transfer';
COMMENT ON COLUMN user_transfers.recipient_email IS 'Email of the user receiving the transfer';
COMMENT ON COLUMN user_transfers.recipient_wallet_address IS 'Wallet address of the recipient';
COMMENT ON COLUMN user_transfers.transfer_amount IS 'Amount transferred to recipient (excluding fee)';
COMMENT ON COLUMN user_transfers.fee_amount IS 'Transaction fee charged (2% of transfer amount)';
COMMENT ON COLUMN user_transfers.total_deducted IS 'Total amount deducted from sender (transfer_amount + fee_amount)';
COMMENT ON COLUMN user_transfers.note IS 'Optional note from sender';
COMMENT ON COLUMN user_transfers.status IS 'Transfer status: completed, failed, pending';
