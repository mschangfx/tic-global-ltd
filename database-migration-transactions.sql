-- Transaction Management System for TIC GLOBAL
-- This migration creates tables for deposit/withdrawal transactions and admin approval system

-- First, create users table if it doesn't exist (required for foreign key)
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
    network VARCHAR(50) NOT NULL, -- TRC20, Polygon, BEP20
    wallet_address TEXT, -- For withdrawals: destination address, For deposits: our receiving address
    user_wallet_address TEXT, -- For withdrawals: user's destination address
    transaction_hash VARCHAR(100), -- Blockchain transaction hash (when available)
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
    admin_notes TEXT,
    approved_by VARCHAR(255), -- Admin email who approved/rejected
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Additional metadata
    processing_fee DECIMAL(10, 4) DEFAULT 0,
    network_fee DECIMAL(10, 4) DEFAULT 0,
    final_amount DECIMAL(18, 8), -- Amount after fees

    -- Request details
    user_ip_address INET,
    user_agent TEXT,
    request_metadata JSONB DEFAULT '{}'

    -- Note: Removed foreign key constraint to avoid dependency issues
    -- We'll validate user_email in the application layer instead
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_email ON transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_network ON transactions(network);

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'new_deposit', 'new_withdrawal', 'status_update'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_transaction_id FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Create indexes for admin notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_transaction_id ON admin_notifications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority);

-- Create admin users table (if not exists)
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

-- Insert default admin user (update email as needed)
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

-- Create function to get deposit-specific statistics
CREATE OR REPLACE FUNCTION get_deposit_stats()
RETURNS TABLE (
    total_deposits INTEGER,
    pending_deposits INTEGER,
    approved_deposits INTEGER,
    total_amount DECIMAL(18, 8),
    pending_amount DECIMAL(18, 8),
    deposits_today INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM transactions WHERE transaction_type = 'deposit'),
        (SELECT COUNT(*)::INTEGER FROM transactions WHERE transaction_type = 'deposit' AND status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM transactions WHERE transaction_type = 'deposit' AND status IN ('approved', 'completed')),
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'deposit'),
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'deposit' AND status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM transactions WHERE transaction_type = 'deposit' AND DATE(created_at) = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Create function to get transaction statistics
CREATE OR REPLACE FUNCTION get_transaction_stats()
RETURNS TABLE (
    total_pending INTEGER,
    total_deposits_today INTEGER,
    total_withdrawals_today INTEGER,
    pending_amount DECIMAL(18, 8)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM transactions WHERE status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM transactions WHERE transaction_type = 'deposit' AND DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*)::INTEGER FROM transactions WHERE transaction_type = 'withdrawal' AND DATE(created_at) = CURRENT_DATE),
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'pending');
END;
$$ LANGUAGE plpgsql;

-- Create QR uploads table for tracking QR code uploads
CREATE TABLE IF NOT EXISTS qr_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    network VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    deposit_amount DECIMAL(18, 8),
    transaction_hash VARCHAR(100),
    upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'rejected', 'failed')),
    admin_notes TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for QR uploads
CREATE INDEX IF NOT EXISTS idx_qr_uploads_user_email ON qr_uploads(user_email);
CREATE INDEX IF NOT EXISTS idx_qr_uploads_network ON qr_uploads(network);
CREATE INDEX IF NOT EXISTS idx_qr_uploads_status ON qr_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_qr_uploads_created_at ON qr_uploads(created_at);

-- Create user wallets table for balance management
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    total_balance DECIMAL(18, 8) DEFAULT 0,
    tic_balance DECIMAL(18, 8) DEFAULT 0,
    gic_balance DECIMAL(18, 8) DEFAULT 0,
    staking_balance DECIMAL(18, 8) DEFAULT 0,
    pending_deposits DECIMAL(18, 8) DEFAULT 0,
    pending_withdrawals DECIMAL(18, 8) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallet transactions table for transaction history
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    transaction_id UUID, -- Reference to main transactions table
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'payment', 'refund', 'bonus')),
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    balance_before DECIMAL(18, 8) NOT NULL,
    balance_after DECIMAL(18, 8) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_wallet_transaction_id FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

-- Create indexes for user wallets
CREATE INDEX IF NOT EXISTS idx_user_wallets_email ON user_wallets(user_email);
CREATE INDEX IF NOT EXISTS idx_user_wallets_total_balance ON user_wallets(total_balance);
CREATE INDEX IF NOT EXISTS idx_user_wallets_last_updated ON user_wallets(last_updated);

-- Create indexes for wallet transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_email ON wallet_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_transaction_id ON wallet_transactions(transaction_id);

-- Function to get or create user wallet
CREATE OR REPLACE FUNCTION get_or_create_user_wallet(user_email_param VARCHAR(255))
RETURNS user_wallets AS $$
DECLARE
    wallet_record user_wallets;
BEGIN
    -- Try to get existing wallet
    SELECT * INTO wallet_record FROM user_wallets WHERE user_email = user_email_param;

    -- If wallet doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO user_wallets (user_email, total_balance, tic_balance, gic_balance, staking_balance)
        VALUES (user_email_param, 0, 0, 0, 0)
        RETURNING * INTO wallet_record;
    END IF;

    RETURN wallet_record;
END;
$$ LANGUAGE plpgsql;

-- Function to credit user wallet (for approved deposits)
CREATE OR REPLACE FUNCTION credit_user_wallet(
    user_email_param VARCHAR(255),
    amount_param DECIMAL(18, 8),
    transaction_id_param UUID,
    description_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    wallet_record user_wallets;
    new_total DECIMAL(18, 8);
    new_tic DECIMAL(18, 8);
    new_gic DECIMAL(18, 8);
    new_staking DECIMAL(18, 8);
BEGIN
    -- Get or create user wallet
    SELECT * INTO wallet_record FROM get_or_create_user_wallet(user_email_param);

    -- Calculate new balances (60% TIC, 30% GIC, 10% Staking)
    new_total := wallet_record.total_balance + amount_param;
    new_tic := wallet_record.tic_balance + (amount_param * 0.6);
    new_gic := wallet_record.gic_balance + (amount_param * 0.3);
    new_staking := wallet_record.staking_balance + (amount_param * 0.1);

    -- Update wallet balances
    UPDATE user_wallets
    SET
        total_balance = new_total,
        tic_balance = new_tic,
        gic_balance = new_gic,
        staking_balance = new_staking,
        last_updated = NOW()
    WHERE user_email = user_email_param;

    -- Create wallet transaction record
    INSERT INTO wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        metadata
    ) VALUES (
        user_email_param,
        transaction_id_param,
        'deposit',
        amount_param,
        wallet_record.total_balance,
        new_total,
        COALESCE(description_param, 'Deposit credited to wallet'),
        jsonb_build_object(
            'tic_credited', amount_param * 0.6,
            'gic_credited', amount_param * 0.3,
            'staking_credited', amount_param * 0.1
        )
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to debit user wallet (for withdrawals/payments)
CREATE OR REPLACE FUNCTION debit_user_wallet(
    user_email_param VARCHAR(255),
    amount_param DECIMAL(18, 8),
    transaction_id_param UUID,
    transaction_type_param VARCHAR(20) DEFAULT 'withdrawal',
    description_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    wallet_record user_wallets;
    new_total DECIMAL(18, 8);
    new_tic DECIMAL(18, 8);
    new_gic DECIMAL(18, 8);
    new_staking DECIMAL(18, 8);
BEGIN
    -- Get user wallet
    SELECT * INTO wallet_record FROM user_wallets WHERE user_email = user_email_param;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User wallet not found';
    END IF;

    -- Check sufficient balance
    IF wallet_record.total_balance < amount_param THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Calculate new balances (proportional deduction)
    new_total := wallet_record.total_balance - amount_param;
    new_tic := wallet_record.tic_balance - (amount_param * 0.6);
    new_gic := wallet_record.gic_balance - (amount_param * 0.3);
    new_staking := wallet_record.staking_balance - (amount_param * 0.1);

    -- Ensure no negative balances
    new_tic := GREATEST(new_tic, 0);
    new_gic := GREATEST(new_gic, 0);
    new_staking := GREATEST(new_staking, 0);

    -- Update wallet balances
    UPDATE user_wallets
    SET
        total_balance = new_total,
        tic_balance = new_tic,
        gic_balance = new_gic,
        staking_balance = new_staking,
        last_updated = NOW()
    WHERE user_email = user_email_param;

    -- Create wallet transaction record
    INSERT INTO wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        metadata
    ) VALUES (
        user_email_param,
        transaction_id_param,
        transaction_type_param,
        amount_param,
        wallet_record.total_balance,
        new_total,
        COALESCE(description_param, 'Amount debited from wallet'),
        jsonb_build_object(
            'tic_debited', amount_param * 0.6,
            'gic_debited', amount_param * 0.3,
            'staking_debited', amount_param * 0.1
        )
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    method_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('crypto', 'bank', 'card', 'digital')),
    network VARCHAR(50),
    symbol VARCHAR(10),
    min_amount DECIMAL(18, 8) DEFAULT 0,
    max_amount DECIMAL(18, 8) DEFAULT 999999999,
    processing_fee_rate DECIMAL(5, 4) DEFAULT 0,
    fixed_fee DECIMAL(18, 8) DEFAULT 0,
    processing_time VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    transaction_id UUID NOT NULL,
    method_id VARCHAR(50) NOT NULL,
    destination_address VARCHAR(255) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    network VARCHAR(50),
    processing_fee DECIMAL(18, 8) DEFAULT 0,
    network_fee DECIMAL(18, 8) DEFAULT 0,
    final_amount DECIMAL(18, 8) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    admin_notes TEXT,
    processed_by VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE,
    blockchain_hash VARCHAR(100),
    confirmation_count INTEGER DEFAULT 0,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    request_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_withdrawal_transaction_id FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_withdrawal_method_id FOREIGN KEY (method_id) REFERENCES payment_methods(method_id) ON DELETE RESTRICT
);

-- Create payment plans table
CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    duration_days INTEGER,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user plan subscriptions table
CREATE TABLE IF NOT EXISTS user_plan_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    transaction_id UUID,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT false,
    payment_amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_subscription_plan_id FOREIGN KEY (plan_id) REFERENCES payment_plans(plan_id) ON DELETE RESTRICT,
    CONSTRAINT fk_subscription_transaction_id FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

-- Create indexes for payment methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_method_id ON payment_methods(method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);

-- Create indexes for withdrawal requests
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_email ON withdrawal_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_method_id ON withdrawal_requests(method_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_transaction_id ON withdrawal_requests(transaction_id);

-- Create indexes for payment plans
CREATE INDEX IF NOT EXISTS idx_payment_plans_plan_id ON payment_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_active ON payment_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_plans_price ON payment_plans(price);

-- Create indexes for user plan subscriptions
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_user_email ON user_plan_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_plan_id ON user_plan_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_status ON user_plan_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_plan_subscriptions_expires_at ON user_plan_subscriptions(expires_at);

-- Insert default payment methods
INSERT INTO payment_methods (method_id, name, type, network, symbol, min_amount, max_amount, processing_fee_rate, processing_time, metadata) VALUES
('usdt-trc20', 'USDT TRC20', 'crypto', 'TRC20', 'USDT', 5, 100000, 0.01, '5-30 minutes', '{"address": "TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF", "explorer": "https://tronscan.org"}'),
('usdt-bep20', 'USDT BEP20', 'crypto', 'BEP20', 'USDT', 10, 50000, 0.015, '3-20 minutes', '{"address": "0xabcdef1234567890abcdef1234567890abcdef12", "explorer": "https://bscscan.com"}'),
('usdt-polygon', 'USDT Polygon', 'crypto', 'Polygon', 'USDT', 5, 75000, 0.012, '2-15 minutes', '{"address": "0x1234567890abcdef1234567890abcdef12345678", "explorer": "https://polygonscan.com"}')
ON CONFLICT (method_id) DO NOTHING;

-- Insert default payment plans
INSERT INTO payment_plans (plan_id, name, description, price, duration_days, features) VALUES
('basic', 'Basic Plan', 'Essential features for getting started', 29.99, 30, '["Basic Trading", "Email Support", "Mobile App Access"]'),
('premium', 'Premium Plan', 'Advanced features for serious traders', 99.99, 30, '["Advanced Trading", "Priority Support", "API Access", "Advanced Analytics"]'),
('enterprise', 'Enterprise Plan', 'Full feature access for professionals', 299.99, 30, '["All Features", "24/7 Support", "Custom Integration", "Dedicated Manager", "White Label"]')
ON CONFLICT (plan_id) DO NOTHING;

-- Function to process plan payment
CREATE OR REPLACE FUNCTION process_plan_payment(
    user_email_param VARCHAR(255),
    plan_id_param VARCHAR(50),
    payment_amount_param DECIMAL(18, 8),
    transaction_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    wallet_record user_wallets;
    plan_record payment_plans;
    subscription_id UUID;
BEGIN
    -- Get user wallet
    SELECT * INTO wallet_record FROM user_wallets WHERE user_email = user_email_param;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User wallet not found';
    END IF;

    -- Get plan details
    SELECT * INTO plan_record FROM payment_plans WHERE plan_id = plan_id_param AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment plan not found or inactive';
    END IF;

    -- Check sufficient balance
    IF wallet_record.total_balance < payment_amount_param THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Debit wallet
    PERFORM debit_user_wallet(
        user_email_param,
        payment_amount_param,
        transaction_id_param,
        'payment',
        'Plan payment: ' || plan_record.name
    );

    -- Create or update subscription
    INSERT INTO user_plan_subscriptions (
        user_email,
        plan_id,
        transaction_id,
        status,
        started_at,
        expires_at,
        payment_amount,
        currency
    ) VALUES (
        user_email_param,
        plan_id_param,
        transaction_id_param,
        'active',
        NOW(),
        NOW() + INTERVAL '1 day' * plan_record.duration_days,
        payment_amount_param,
        plan_record.currency
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to process withdrawal request
CREATE OR REPLACE FUNCTION process_withdrawal_request(
    user_email_param VARCHAR(255),
    method_id_param VARCHAR(50),
    destination_address_param VARCHAR(255),
    amount_param DECIMAL(18, 8),
    transaction_id_param UUID
)
RETURNS UUID AS $$
DECLARE
    wallet_record user_wallets;
    method_record payment_methods;
    processing_fee DECIMAL(18, 8);
    network_fee DECIMAL(18, 8);
    final_amount DECIMAL(18, 8);
    withdrawal_id UUID;
BEGIN
    -- Get user wallet
    SELECT * INTO wallet_record FROM user_wallets WHERE user_email = user_email_param;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User wallet not found';
    END IF;

    -- Get payment method
    SELECT * INTO method_record FROM payment_methods WHERE method_id = method_id_param AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment method not found or inactive';
    END IF;

    -- Calculate fees
    processing_fee := amount_param * method_record.processing_fee_rate + method_record.fixed_fee;
    network_fee := 0; -- Can be calculated based on network conditions
    final_amount := amount_param - processing_fee - network_fee;

    -- Check minimum amount
    IF amount_param < method_record.min_amount THEN
        RAISE EXCEPTION 'Amount below minimum: %', method_record.min_amount;
    END IF;

    -- Check maximum amount
    IF amount_param > method_record.max_amount THEN
        RAISE EXCEPTION 'Amount above maximum: %', method_record.max_amount;
    END IF;

    -- Check sufficient balance
    IF wallet_record.total_balance < amount_param THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Create withdrawal request
    INSERT INTO withdrawal_requests (
        user_email,
        transaction_id,
        method_id,
        destination_address,
        amount,
        currency,
        network,
        processing_fee,
        network_fee,
        final_amount,
        status,
        estimated_completion,
        request_metadata
    ) VALUES (
        user_email_param,
        transaction_id_param,
        method_id_param,
        destination_address_param,
        amount_param,
        'USD',
        method_record.network,
        processing_fee,
        network_fee,
        final_amount,
        'pending',
        NOW() + INTERVAL '24 hours',
        jsonb_build_object(
            'method_name', method_record.name,
            'processing_time', method_record.processing_time
        )
    ) RETURNING id INTO withdrawal_id;

    -- Debit wallet (hold the funds)
    PERFORM debit_user_wallet(
        user_email_param,
        amount_param,
        transaction_id_param,
        'withdrawal',
        'Withdrawal request: ' || method_record.name || ' to ' || destination_address_param
    );

    RETURN withdrawal_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's active subscriptions
CREATE OR REPLACE FUNCTION get_user_active_subscriptions(user_email_param VARCHAR(255))
RETURNS TABLE (
    subscription_id UUID,
    plan_id VARCHAR(50),
    plan_name VARCHAR(100),
    status VARCHAR(20),
    started_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER,
    payment_amount DECIMAL(18, 8)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ups.id,
        ups.plan_id,
        pp.name,
        ups.status,
        ups.started_at,
        ups.expires_at,
        CASE
            WHEN ups.expires_at > NOW() THEN EXTRACT(DAY FROM ups.expires_at - NOW())::INTEGER
            ELSE 0
        END,
        ups.payment_amount
    FROM user_plan_subscriptions ups
    JOIN payment_plans pp ON ups.plan_id = pp.plan_id
    WHERE ups.user_email = user_email_param
    AND ups.status = 'active'
    AND (ups.expires_at IS NULL OR ups.expires_at > NOW())
    ORDER BY ups.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get withdrawal statistics
CREATE OR REPLACE FUNCTION get_withdrawal_stats()
RETURNS TABLE (
    total_withdrawals INTEGER,
    pending_withdrawals INTEGER,
    completed_withdrawals INTEGER,
    total_amount DECIMAL(18, 8),
    pending_amount DECIMAL(18, 8),
    withdrawals_today INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM withdrawal_requests),
        (SELECT COUNT(*)::INTEGER FROM withdrawal_requests WHERE status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM withdrawal_requests WHERE status = 'completed'),
        (SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests),
        (SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests WHERE status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM withdrawal_requests WHERE DATE(created_at) = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Function to approve withdrawal
CREATE OR REPLACE FUNCTION approve_withdrawal(
    withdrawal_id_param UUID,
    admin_email_param VARCHAR(255),
    blockchain_hash_param VARCHAR(100) DEFAULT NULL,
    admin_notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    withdrawal_record withdrawal_requests;
BEGIN
    -- Get withdrawal request
    SELECT * INTO withdrawal_record FROM withdrawal_requests WHERE id = withdrawal_id_param;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal request not found';
    END IF;

    -- Update withdrawal status
    UPDATE withdrawal_requests
    SET
        status = 'completed',
        processed_by = admin_email_param,
        processed_at = NOW(),
        blockchain_hash = blockchain_hash_param,
        admin_notes = admin_notes_param,
        updated_at = NOW()
    WHERE id = withdrawal_id_param;

    -- Update related transaction
    UPDATE transactions
    SET
        status = 'completed',
        transaction_hash = blockchain_hash_param,
        approved_by = admin_email_param,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = withdrawal_record.transaction_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON transactions TO your_app_user;
-- GRANT ALL PRIVILEGES ON admin_notifications TO your_app_user;
-- GRANT ALL PRIVILEGES ON admin_users TO your_app_user;
-- GRANT ALL PRIVILEGES ON qr_uploads TO your_app_user;
-- GRANT ALL PRIVILEGES ON user_wallets TO your_app_user;
-- GRANT ALL PRIVILEGES ON wallet_transactions TO your_app_user;
-- GRANT ALL PRIVILEGES ON payment_methods TO your_app_user;
-- GRANT ALL PRIVILEGES ON withdrawal_requests TO your_app_user;
-- GRANT ALL PRIVILEGES ON payment_plans TO your_app_user;
-- GRANT ALL PRIVILEGES ON user_plan_subscriptions TO your_app_user;
