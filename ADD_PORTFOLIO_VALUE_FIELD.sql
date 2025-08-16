-- Add portfolio_value field to track stable total value
-- This field represents the true portfolio value and only changes with external transactions:
-- - Deposits (increases portfolio_value)
-- - Withdrawals (decreases portfolio_value)
-- - Transfers to other users (decreases portfolio_value)
-- Internal transfers between own wallets do NOT affect portfolio_value

-- Add portfolio_value column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_wallets' AND column_name = 'portfolio_value') THEN
        ALTER TABLE public.user_wallets ADD COLUMN portfolio_value DECIMAL(18, 8) DEFAULT 0;
        
        -- Initialize portfolio_value for existing users by calculating current total
        UPDATE public.user_wallets 
        SET portfolio_value = COALESCE(total_balance, 0) + 
                             COALESCE(tic_balance, 0) * 0.02 + -- TIC price $0.02
                             COALESCE(gic_balance, 0) * 63.00 + -- GIC price $63.00
                             COALESCE(staking_balance, 0) + 
                             COALESCE(partner_wallet_balance, 0)
        WHERE portfolio_value = 0 OR portfolio_value IS NULL;
        
        RAISE NOTICE 'Added portfolio_value column and initialized values for existing users';
    ELSE
        RAISE NOTICE 'portfolio_value column already exists';
    END IF;
END $$;

-- Create or replace function to update portfolio value for external transactions only
CREATE OR REPLACE FUNCTION update_portfolio_value(
    user_email_param VARCHAR(255),
    amount_change_param DECIMAL(18, 8),
    transaction_type_param VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_portfolio_value DECIMAL(18,8);
    new_portfolio_value DECIMAL(18,8);
    wallet_exists BOOLEAN;
BEGIN
    -- Check if wallet exists
    SELECT EXISTS(SELECT 1 FROM public.user_wallets WHERE user_email = user_email_param) INTO wallet_exists;
    
    IF NOT wallet_exists THEN
        -- Create wallet with initial portfolio value
        INSERT INTO public.user_wallets (
            user_email, 
            total_balance, 
            tic_balance, 
            gic_balance, 
            staking_balance, 
            partner_wallet_balance,
            portfolio_value,
            last_updated
        ) VALUES (
            user_email_param, 
            0, 0, 0, 0, 0,
            GREATEST(amount_change_param, 0), -- Only positive amounts for new wallets
            NOW()
        );
        
        RETURN TRUE;
    END IF;
    
    -- Get current portfolio value
    SELECT COALESCE(portfolio_value, 0) INTO current_portfolio_value 
    FROM public.user_wallets 
    WHERE user_email = user_email_param;
    
    -- Calculate new portfolio value
    new_portfolio_value := current_portfolio_value + amount_change_param;
    
    -- Ensure portfolio value doesn't go negative
    IF new_portfolio_value < 0 THEN
        new_portfolio_value := 0;
    END IF;
    
    -- Update portfolio value
    UPDATE public.user_wallets 
    SET portfolio_value = new_portfolio_value,
        last_updated = NOW()
    WHERE user_email = user_email_param;
    
    -- Log the portfolio value change
    RAISE NOTICE 'Portfolio value updated for %: % -> % (change: %, type: %)', 
                 user_email_param, current_portfolio_value, new_portfolio_value, 
                 amount_change_param, transaction_type_param;
    
    RETURN TRUE;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_portfolio_value(VARCHAR(255), DECIMAL(18, 8), VARCHAR(50)) TO authenticated;
GRANT EXECUTE ON FUNCTION update_portfolio_value(VARCHAR(255), DECIMAL(18, 8), VARCHAR(50)) TO anon;
