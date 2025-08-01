-- Simple Transaction Management System for TIC GLOBAL
-- This version avoids foreign key constraints to prevent errors

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table for all deposit and withdrawal requests
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    network VARCHAR(50) NOT NULL,
    wallet_address TEXT,
    user_wallet_address TEXT,
    transaction_hash VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
    admin_notes TEXT,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_fee DECIMAL(10, 4) DEFAULT 0,
    network_fee DECIMAL(10, 4) DEFAULT 0,
    final_amount DECIMAL(18, 8),
    user_ip_address INET,
    user_agent TEXT,
    request_metadata JSONB DEFAULT '{}'
);

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'moderator')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_email ON transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_network ON transactions(network);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_transaction_id ON admin_notifications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at);

-- Insert default admin user
INSERT INTO admin_users (email, name, role, permissions) 
VALUES (
    'admin@ticgloballtd.com', 
    'TIC GLOBAL Admin', 
    'super_admin',
    '{"can_approve_transactions": true, "can_manage_users": true, "can_view_reports": true}'
) ON CONFLICT (email) DO NOTHING;

-- Create function to automatically create admin notification when transaction is created
CREATE OR REPLACE FUNCTION create_admin_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for new transactions
    IF TG_OP = 'INSERT' THEN
        INSERT INTO admin_notifications (
            transaction_id,
            notification_type,
            title,
            message,
            priority
        ) VALUES (
            NEW.id,
            CASE 
                WHEN NEW.transaction_type = 'deposit' THEN 'new_deposit'
                WHEN NEW.transaction_type = 'withdrawal' THEN 'new_withdrawal'
                ELSE 'status_update'
            END,
            CASE 
                WHEN NEW.transaction_type = 'deposit' THEN 'New Deposit Request'
                WHEN NEW.transaction_type = 'withdrawal' THEN 'New Withdrawal Request'
                ELSE 'Transaction Update'
            END,
            CASE 
                WHEN NEW.transaction_type = 'deposit' THEN 
                    'User ' || NEW.user_email || ' has requested a deposit of $' || NEW.amount || ' via ' || NEW.network
                WHEN NEW.transaction_type = 'withdrawal' THEN 
                    'User ' || NEW.user_email || ' has requested a withdrawal of $' || NEW.amount || ' via ' || NEW.network || ' to address: ' || COALESCE(NEW.user_wallet_address, 'N/A')
                ELSE 'Transaction status updated'
            END,
            CASE 
                WHEN NEW.transaction_type = 'withdrawal' THEN 'high'
                WHEN NEW.amount > 1000 THEN 'high'
                WHEN NEW.amount > 100 THEN 'medium'
                ELSE 'low'
            END
        );
    END IF;
    
    -- Create notification for status updates
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO admin_notifications (
            transaction_id,
            notification_type,
            title,
            message,
            priority
        ) VALUES (
            NEW.id,
            'status_update',
            'Transaction Status Updated',
            'Transaction ' || NEW.id || ' for user ' || NEW.user_email || ' has been ' || NEW.status || 
            CASE WHEN NEW.approved_by IS NOT NULL THEN ' by ' || NEW.approved_by ELSE '' END,
            'medium'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_create_admin_notification ON transactions;
CREATE TRIGGER trigger_create_admin_notification
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_admin_notification();

-- Create function to update transaction status
CREATE OR REPLACE FUNCTION update_transaction_status(
    transaction_id_param UUID,
    new_status VARCHAR(20),
    admin_email VARCHAR(255),
    admin_notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    transaction_exists BOOLEAN;
BEGIN
    -- Check if transaction exists
    SELECT EXISTS(SELECT 1 FROM transactions WHERE id = transaction_id_param) INTO transaction_exists;
    
    IF NOT transaction_exists THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;
    
    -- Update transaction
    UPDATE transactions 
    SET 
        status = new_status,
        approved_by = admin_email,
        approved_at = NOW(),
        admin_notes = COALESCE(admin_notes_param, admin_notes),
        updated_at = NOW()
    WHERE id = transaction_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get pending transactions for admin
CREATE OR REPLACE FUNCTION get_pending_transactions()
RETURNS TABLE (
    id UUID,
    user_email VARCHAR(255),
    transaction_type VARCHAR(20),
    amount DECIMAL(18, 8),
    currency VARCHAR(10),
    network VARCHAR(50),
    wallet_address TEXT,
    user_wallet_address TEXT,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    days_pending INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.user_email,
        t.transaction_type,
        t.amount,
        t.currency,
        t.network,
        t.wallet_address,
        t.user_wallet_address,
        t.status,
        t.created_at,
        EXTRACT(DAY FROM NOW() - t.created_at)::INTEGER as days_pending
    FROM transactions t
    WHERE t.status = 'pending'
    ORDER BY t.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get admin notifications
CREATE OR REPLACE FUNCTION get_admin_notifications(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    transaction_id UUID,
    notification_type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN,
    priority VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    transaction_amount DECIMAL(18, 8),
    transaction_user VARCHAR(255),
    transaction_network VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        an.id,
        an.transaction_id,
        an.notification_type,
        an.title,
        an.message,
        an.is_read,
        an.priority,
        an.created_at,
        t.amount as transaction_amount,
        t.user_email as transaction_user,
        t.network as transaction_network
    FROM admin_notifications an
    LEFT JOIN transactions t ON an.transaction_id = t.id
    ORDER BY an.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
