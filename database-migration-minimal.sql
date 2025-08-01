-- Minimal Transaction Management System for TIC GLOBAL
-- Updated to handle existing tables safely

-- Create transactions table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    network VARCHAR(50) NOT NULL,
    wallet_address TEXT,
    user_wallet_address TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_fee DECIMAL(10, 4) DEFAULT 0,
    network_fee DECIMAL(10, 4) DEFAULT 0,
    final_amount DECIMAL(18, 8),
    request_metadata JSONB DEFAULT '{}'
);

-- Add missing columns to existing transactions table if they don't exist
DO $$
BEGIN
    -- Add user_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='user_email') THEN
        ALTER TABLE transactions ADD COLUMN user_email VARCHAR(255);
    END IF;

    -- Add transaction_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='transaction_type') THEN
        ALTER TABLE transactions ADD COLUMN transaction_type VARCHAR(20);
    END IF;

    -- Add amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='amount') THEN
        ALTER TABLE transactions ADD COLUMN amount DECIMAL(18, 8);
    END IF;

    -- Add network column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='network') THEN
        ALTER TABLE transactions ADD COLUMN network VARCHAR(50);
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='status') THEN
        ALTER TABLE transactions ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    END IF;

    -- Add wallet_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='wallet_address') THEN
        ALTER TABLE transactions ADD COLUMN wallet_address TEXT;
    END IF;

    -- Add user_wallet_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='user_wallet_address') THEN
        ALTER TABLE transactions ADD COLUMN user_wallet_address TEXT;
    END IF;

    -- Add admin_notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='admin_notes') THEN
        ALTER TABLE transactions ADD COLUMN admin_notes TEXT;
    END IF;

    -- Add approved_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='approved_by') THEN
        ALTER TABLE transactions ADD COLUMN approved_by VARCHAR(255);
    END IF;

    -- Add approved_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='approved_at') THEN
        ALTER TABLE transactions ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add processing_fee column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='processing_fee') THEN
        ALTER TABLE transactions ADD COLUMN processing_fee DECIMAL(10, 4) DEFAULT 0;
    END IF;

    -- Add network_fee column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='network_fee') THEN
        ALTER TABLE transactions ADD COLUMN network_fee DECIMAL(10, 4) DEFAULT 0;
    END IF;

    -- Add final_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='final_amount') THEN
        ALTER TABLE transactions ADD COLUMN final_amount DECIMAL(18, 8);
    END IF;

    -- Add request_metadata column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='request_metadata') THEN
        ALTER TABLE transactions ADD COLUMN request_metadata JSONB DEFAULT '{}';
    END IF;

    -- Add currency column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='currency') THEN
        ALTER TABLE transactions ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
    END IF;
END $$;

-- Create admin notifications table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin users table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (only if it doesn't exist)
INSERT INTO admin_users (email, name, role)
VALUES ('admin@ticgloballtd.com', 'TIC GLOBAL Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;
