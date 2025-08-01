-- Create notifications table for storing user notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'transaction', 'deposit', 'withdrawal', 'payment', 'reward', 
        'referral', 'rank_change', 'verification', 'security', 'system'
    )),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500), -- Optional URL for notification action
    metadata JSONB, -- Additional data like transaction_id, amount, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration for notifications
    
    -- Foreign key constraint
    CONSTRAINT fk_notifications_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_email, is_read) WHERE is_read = FALSE;

-- Create a function to automatically clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_read = TRUE;
    
    -- Also delete expired notifications
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update read_at timestamp when is_read is set to true
CREATE OR REPLACE FUNCTION update_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_read_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_read_at();

-- Insert some sample notifications for testing
INSERT INTO notifications (user_email, title, message, type, priority, metadata) VALUES
('demo@example.com', 'Welcome to TIC Global!', 'Your account has been successfully created. Complete your verification to unlock all features.', 'system', 'medium', '{"action": "verify_account"}'),
('demo@example.com', 'Deposit Successful', 'Your deposit of $100.00 has been processed successfully.', 'deposit', 'medium', '{"amount": 100.00, "currency": "USD", "transaction_id": "dep_123456"}'),
('demo@example.com', 'New Referral Bonus', 'You earned $5.00 commission from your referral network.', 'referral', 'medium', '{"amount": 5.00, "currency": "USD", "referral_email": "newuser@example.com"}'),
('demo@example.com', 'Rank Upgrade Available', 'You are eligible for rank upgrade! Complete 2 more referrals to reach Silver rank.', 'rank_change', 'high', '{"current_rank": "starter", "next_rank": "silver", "referrals_needed": 2}'),
('demo@example.com', 'Security Alert', 'New login detected from a different device. If this was not you, please secure your account.', 'security', 'urgent', '{"ip_address": "192.168.1.1", "device": "Chrome on Windows", "location": "Philippines"}'
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT USAGE ON SEQUENCE notifications_id_seq TO authenticated;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_email = auth.jwt() ->> 'email');

-- Allow system to insert notifications for any user
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Allow system to delete old notifications
CREATE POLICY "System can delete old notifications" ON notifications
    FOR DELETE USING (true);

COMMENT ON TABLE notifications IS 'Stores user notifications for transactions, system alerts, and other important events';
COMMENT ON COLUMN notifications.type IS 'Type of notification: transaction, deposit, withdrawal, payment, reward, referral, rank_change, verification, security, system';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, medium, high, urgent';
COMMENT ON COLUMN notifications.metadata IS 'Additional JSON data specific to the notification type';
COMMENT ON COLUMN notifications.action_url IS 'Optional URL to redirect user when notification is clicked';
COMMENT ON COLUMN notifications.expires_at IS 'Optional expiration date for time-sensitive notifications';
