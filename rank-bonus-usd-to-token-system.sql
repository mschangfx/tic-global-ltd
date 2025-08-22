-- RANK BONUS USD-TO-TOKEN CONVERSION SYSTEM
-- This SQL updates the rank bonus system to properly handle USD bonuses
-- and convert them to equivalent TIC and GIC tokens based on current rates

-- 1. Create token exchange rates table
CREATE TABLE IF NOT EXISTS token_exchange_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_symbol VARCHAR(10) NOT NULL,
    usd_rate DECIMAL(18, 8) NOT NULL, -- How much USD = 1 token
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(token_symbol, is_active)
);

-- Insert default exchange rates
INSERT INTO token_exchange_rates (token_symbol, usd_rate, is_active) VALUES
('TIC', 1.00, TRUE), -- 1 TIC = $1.00 USD
('GIC', 1.05, TRUE)  -- 1 GIC = $1.05 USD (63 pesos ÷ 60 peso/USD rate)
ON CONFLICT (token_symbol, is_active) DO UPDATE SET
    usd_rate = EXCLUDED.usd_rate,
    updated_at = NOW();

-- 2. Function to get current token exchange rate
CREATE OR REPLACE FUNCTION get_token_exchange_rate(token_symbol_param TEXT)
RETURNS DECIMAL(18, 8) AS $$
DECLARE
    exchange_rate DECIMAL(18, 8);
BEGIN
    SELECT usd_rate INTO exchange_rate
    FROM token_exchange_rates
    WHERE token_symbol = token_symbol_param AND is_active = TRUE;
    
    -- Default to 1.00 if no rate found
    RETURN COALESCE(exchange_rate, 1.00);
END;
$$ LANGUAGE plpgsql;

-- 3. Function to convert USD to tokens
CREATE OR REPLACE FUNCTION convert_usd_to_tokens(
    usd_amount_param DECIMAL(18, 8),
    token_symbol_param TEXT
)
RETURNS DECIMAL(18, 8) AS $$
DECLARE
    exchange_rate DECIMAL(18, 8);
    token_amount DECIMAL(18, 8);
BEGIN
    -- Get current exchange rate
    exchange_rate := get_token_exchange_rate(token_symbol_param);
    
    -- Calculate token amount: USD_amount / USD_per_token = tokens
    token_amount := usd_amount_param / exchange_rate;
    
    RETURN token_amount;
END;
$$ LANGUAGE plpgsql;

-- 4. Updated rank bonus distribution function with USD-to-token conversion
CREATE OR REPLACE FUNCTION process_user_rank_bonus_with_usd_conversion(
    user_email_param TEXT,
    distribution_month_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_referrals INTEGER;
    user_rank TEXT;
    bonus_amount_usd DECIMAL(10, 2);
    usd_split_amount DECIMAL(18, 8);
    tic_token_amount DECIMAL(18, 8);
    gic_token_amount DECIMAL(18, 8);
    tic_exchange_rate DECIMAL(18, 8);
    gic_exchange_rate DECIMAL(18, 8);
    tic_transaction_id TEXT;
    gic_transaction_id TEXT;
BEGIN
    -- Get user's total direct referrals
    SELECT COUNT(*) INTO user_referrals
    FROM referral_relationships
    WHERE referrer_email = user_email_param 
    AND level_depth = 1 
    AND is_active = true;
    
    -- Determine rank based on referrals
    IF user_referrals >= 25 THEN
        user_rank := 'Diamond';
        bonus_amount_usd := 14904.00;
    ELSIF user_referrals >= 20 THEN
        user_rank := 'Platinum';
        bonus_amount_usd := 8832.00;
    ELSIF user_referrals >= 15 THEN
        user_rank := 'Gold';
        bonus_amount_usd := 4830.00;
    ELSIF user_referrals >= 10 THEN
        user_rank := 'Silver';
        bonus_amount_usd := 2484.00;
    ELSIF user_referrals >= 5 THEN
        user_rank := 'Bronze';
        bonus_amount_usd := 690.00;
    ELSE
        user_rank := 'No Rank';
        bonus_amount_usd := 0.00;
    END IF;
    
    -- Only process if user has a bonus-earning rank
    IF bonus_amount_usd > 0 THEN
        -- Split USD amount 50/50
        usd_split_amount := bonus_amount_usd / 2; -- $345 for Bronze, etc.
        
        -- Get current exchange rates
        tic_exchange_rate := get_token_exchange_rate('TIC');
        gic_exchange_rate := get_token_exchange_rate('GIC');
        
        -- Convert USD to token amounts
        tic_token_amount := convert_usd_to_tokens(usd_split_amount, 'TIC');
        gic_token_amount := convert_usd_to_tokens(usd_split_amount, 'GIC');
        
        -- Create distribution record with USD and token amounts
        INSERT INTO rank_bonus_distributions (
            user_email,
            rank,
            total_referrals,
            bonus_amount,
            tic_amount,
            gic_amount,
            distribution_month,
            status,
            usd_tic_amount,
            usd_gic_amount,
            tic_exchange_rate,
            gic_exchange_rate
        ) VALUES (
            user_email_param,
            user_rank,
            user_referrals,
            bonus_amount_usd,
            tic_token_amount,
            gic_token_amount,
            distribution_month_param,
            'pending',
            usd_split_amount,
            usd_split_amount,
            tic_exchange_rate,
            gic_exchange_rate
        );
        
        -- Generate unique transaction IDs
        tic_transaction_id := 'rank_bonus_tic_' || distribution_month_param || '_' || user_email_param;
        gic_transaction_id := 'rank_bonus_gic_' || distribution_month_param || '_' || user_email_param;

        -- Credit TIC tokens to user wallet with transaction history
        PERFORM increment_tic_balance_with_history(
            user_email_param,
            tic_token_amount,
            tic_transaction_id,
            'Rank Bonus - ' || user_rank || ' (' || distribution_month_param || ') - $' || usd_split_amount || ' USD → ' || tic_token_amount || ' TIC (Rate: $' || tic_exchange_rate || '/TIC)'
        );

        -- Credit GIC tokens to user wallet with transaction history
        PERFORM increment_gic_balance_with_history(
            user_email_param,
            gic_token_amount,
            gic_transaction_id,
            'Rank Bonus - ' || user_rank || ' (' || distribution_month_param || ') - $' || usd_split_amount || ' USD → ' || gic_token_amount || ' GIC (Rate: $' || gic_exchange_rate || '/GIC)'
        );
        
        -- Update distribution status
        UPDATE rank_bonus_distributions
        SET 
            status = 'completed',
            processed_at = NOW()
        WHERE user_email = user_email_param AND distribution_month = distribution_month_param;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Add columns to rank_bonus_distributions table for USD tracking
ALTER TABLE rank_bonus_distributions 
ADD COLUMN IF NOT EXISTS usd_tic_amount DECIMAL(18, 8),
ADD COLUMN IF NOT EXISTS usd_gic_amount DECIMAL(18, 8),
ADD COLUMN IF NOT EXISTS tic_exchange_rate DECIMAL(18, 8),
ADD COLUMN IF NOT EXISTS gic_exchange_rate DECIMAL(18, 8);

-- 6. Function to update token exchange rates
CREATE OR REPLACE FUNCTION update_token_exchange_rate(
    token_symbol_param TEXT,
    new_usd_rate_param DECIMAL(18, 8)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Deactivate old rate
    UPDATE token_exchange_rates
    SET is_active = FALSE, updated_at = NOW()
    WHERE token_symbol = token_symbol_param AND is_active = TRUE;
    
    -- Insert new rate
    INSERT INTO token_exchange_rates (token_symbol, usd_rate, is_active)
    VALUES (token_symbol_param, new_usd_rate_param, TRUE);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 7. View for easy exchange rate management
CREATE OR REPLACE VIEW current_token_rates AS
SELECT 
    token_symbol,
    usd_rate,
    created_at,
    updated_at
FROM token_exchange_rates
WHERE is_active = TRUE
ORDER BY token_symbol;

-- 8. Function to get rank bonus breakdown with USD conversion
CREATE OR REPLACE FUNCTION get_rank_bonus_breakdown(
    user_email_param TEXT,
    distribution_month_param TEXT
)
RETURNS TABLE(
    rank TEXT,
    total_referrals INTEGER,
    bonus_amount_usd DECIMAL(10, 2),
    usd_tic_amount DECIMAL(18, 8),
    usd_gic_amount DECIMAL(18, 8),
    tic_tokens DECIMAL(18, 8),
    gic_tokens DECIMAL(18, 8),
    tic_rate DECIMAL(18, 8),
    gic_rate DECIMAL(18, 8)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rbd.rank,
        rbd.total_referrals,
        rbd.bonus_amount,
        rbd.usd_tic_amount,
        rbd.usd_gic_amount,
        rbd.tic_amount,
        rbd.gic_amount,
        rbd.tic_exchange_rate,
        rbd.gic_exchange_rate
    FROM rank_bonus_distributions rbd
    WHERE rbd.user_email = user_email_param 
    AND rbd.distribution_month = distribution_month_param;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON token_exchange_rates TO authenticated;
GRANT SELECT ON current_token_rates TO authenticated;
GRANT EXECUTE ON FUNCTION get_token_exchange_rate TO authenticated;
GRANT EXECUTE ON FUNCTION convert_usd_to_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION process_user_rank_bonus_with_usd_conversion TO authenticated;
GRANT EXECUTE ON FUNCTION update_token_exchange_rate TO authenticated;
GRANT EXECUTE ON FUNCTION get_rank_bonus_breakdown TO authenticated;

-- Comments for documentation
COMMENT ON TABLE token_exchange_rates IS 'Stores current USD exchange rates for TIC and GIC tokens';
COMMENT ON FUNCTION process_user_rank_bonus_with_usd_conversion IS 'Processes rank bonuses in USD and converts to equivalent TIC/GIC tokens';
COMMENT ON FUNCTION convert_usd_to_tokens IS 'Converts USD amount to token amount based on current exchange rate';
COMMENT ON VIEW current_token_rates IS 'Shows current active exchange rates for all tokens';
