-- GIC TOKEN PRICING SYSTEM WITH PESO-TO-USD CONVERSION
-- This system handles GIC token pricing in pesos with automatic USD conversion
-- Buy Rate: 1 GIC = 63 pesos
-- Sell Rate: 1 GIC = 60 pesos

-- 1. Create GIC token pricing table
CREATE TABLE IF NOT EXISTS gic_token_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buy_rate_pesos DECIMAL(10, 2) NOT NULL DEFAULT 63.00, -- 1 GIC = 63 pesos when buying
    sell_rate_pesos DECIMAL(10, 2) NOT NULL DEFAULT 60.00, -- 1 GIC = 60 pesos when selling
    peso_to_usd_rate DECIMAL(10, 4) NOT NULL DEFAULT 0.0167, -- 1 peso = ~$0.0167 USD (60 pesos = $1 USD)
    buy_rate_usd DECIMAL(10, 4) GENERATED ALWAYS AS (buy_rate_pesos * peso_to_usd_rate) STORED,
    sell_rate_usd DECIMAL(10, 4) GENERATED ALWAYS AS (sell_rate_pesos * peso_to_usd_rate) STORED,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default GIC pricing
INSERT INTO gic_token_pricing (buy_rate_pesos, sell_rate_pesos, peso_to_usd_rate, is_active) VALUES
(63.00, 60.00, 0.0167, TRUE) -- 63 pesos buy, 60 pesos sell, ~60 pesos per USD
ON CONFLICT DO NOTHING;

-- 2. Function to get current GIC pricing
CREATE OR REPLACE FUNCTION get_gic_pricing()
RETURNS TABLE(
    buy_rate_pesos DECIMAL(10, 2),
    sell_rate_pesos DECIMAL(10, 2),
    peso_to_usd_rate DECIMAL(10, 4),
    buy_rate_usd DECIMAL(10, 4),
    sell_rate_usd DECIMAL(10, 4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gtp.buy_rate_pesos,
        gtp.sell_rate_pesos,
        gtp.peso_to_usd_rate,
        gtp.buy_rate_usd,
        gtp.sell_rate_usd
    FROM gic_token_pricing gtp
    WHERE gtp.is_active = TRUE
    ORDER BY gtp.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to convert GIC tokens to USD (for selling/withdrawing)
CREATE OR REPLACE FUNCTION convert_gic_to_usd(
    gic_amount_param DECIMAL(18, 8)
)
RETURNS DECIMAL(18, 8) AS $$
DECLARE
    pricing_info RECORD;
    usd_value DECIMAL(18, 8);
BEGIN
    -- Get current GIC pricing
    SELECT * INTO pricing_info FROM get_gic_pricing();
    
    -- Calculate USD value using sell rate
    usd_value := gic_amount_param * pricing_info.sell_rate_usd;
    
    RETURN usd_value;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to convert USD to GIC tokens (for buying/receiving bonuses)
CREATE OR REPLACE FUNCTION convert_usd_to_gic(
    usd_amount_param DECIMAL(18, 8)
)
RETURNS DECIMAL(18, 8) AS $$
DECLARE
    pricing_info RECORD;
    gic_amount DECIMAL(18, 8);
BEGIN
    -- Get current GIC pricing
    SELECT * INTO pricing_info FROM get_gic_pricing();
    
    -- Calculate GIC amount using buy rate
    gic_amount := usd_amount_param / pricing_info.buy_rate_usd;
    
    RETURN gic_amount;
END;
$$ LANGUAGE plpgsql;

-- 5. Updated rank bonus distribution with GIC peso pricing
CREATE OR REPLACE FUNCTION process_rank_bonus_with_gic_pricing(
    user_email_param TEXT,
    distribution_month_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    qualification_result RECORD;
    usd_split_amount DECIMAL(18, 8);
    tic_token_amount DECIMAL(18, 8);
    gic_token_amount DECIMAL(18, 8);
    tic_exchange_rate DECIMAL(18, 8);
    gic_pricing_info RECORD;
    tic_transaction_id TEXT;
    gic_transaction_id TEXT;
BEGIN
    -- Calculate group volumes and determine qualification
    PERFORM calculate_user_group_volumes(user_email_param, distribution_month_param);
    
    SELECT * INTO qualification_result
    FROM determine_rank_qualification(user_email_param, distribution_month_param);
    
    -- Only distribute bonus if user is qualified
    IF qualification_result.is_qualified AND qualification_result.bonus_amount > 0 THEN
        -- Split USD amount 50/50
        usd_split_amount := qualification_result.bonus_amount / 2;
        
        -- Get current exchange rates
        tic_exchange_rate := get_token_exchange_rate('TIC'); -- 1 TIC = $1.00 USD
        SELECT * INTO gic_pricing_info FROM get_gic_pricing();
        
        -- Convert USD to token amounts
        tic_token_amount := usd_split_amount / tic_exchange_rate; -- TIC: $1 USD = 1 TIC
        gic_token_amount := convert_usd_to_gic(usd_split_amount); -- GIC: Use peso pricing
        
        -- Create distribution record with detailed pricing info
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
            gic_exchange_rate,
            group_volume_total,
            active_players_total,
            gic_buy_rate_pesos,
            gic_sell_rate_pesos,
            peso_to_usd_rate
        ) VALUES (
            user_email_param,
            qualification_result.qualified_rank,
            qualification_result.total_active_players,
            qualification_result.bonus_amount,
            tic_token_amount,
            gic_token_amount,
            distribution_month_param,
            'pending',
            usd_split_amount,
            usd_split_amount,
            tic_exchange_rate,
            gic_pricing_info.buy_rate_usd,
            qualification_result.total_volume,
            qualification_result.total_active_players,
            gic_pricing_info.buy_rate_pesos,
            gic_pricing_info.sell_rate_pesos,
            gic_pricing_info.peso_to_usd_rate
        );
        
        -- Generate unique transaction IDs
        tic_transaction_id := 'rank_bonus_tic_' || distribution_month_param || '_' || user_email_param;
        gic_transaction_id := 'rank_bonus_gic_' || distribution_month_param || '_' || user_email_param;

        -- Credit TIC tokens (1:1 USD rate)
        PERFORM increment_tic_balance_with_history(
            user_email_param,
            tic_token_amount,
            tic_transaction_id,
            'Rank Bonus - ' || qualification_result.qualified_rank || ' (' || distribution_month_param || ') - $' || usd_split_amount || ' USD → ' || tic_token_amount || ' TIC (Rate: $1.00/TIC)'
        );

        -- Credit GIC tokens (peso-based pricing)
        PERFORM increment_gic_balance_with_history(
            user_email_param,
            gic_token_amount,
            gic_transaction_id,
            'Rank Bonus - ' || qualification_result.qualified_rank || ' (' || distribution_month_param || ') - $' || usd_split_amount || ' USD → ' || gic_token_amount || ' GIC (Rate: ' || gic_pricing_info.buy_rate_pesos || ' pesos = $' || gic_pricing_info.buy_rate_usd || ' USD per GIC)'
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

-- 6. Function to calculate GIC wallet value in USD
CREATE OR REPLACE FUNCTION get_gic_wallet_usd_value(
    user_email_param TEXT
)
RETURNS DECIMAL(18, 8) AS $$
DECLARE
    gic_balance DECIMAL(18, 8);
    usd_value DECIMAL(18, 8);
BEGIN
    -- Get user's GIC balance
    SELECT gic_balance INTO gic_balance
    FROM user_wallets
    WHERE user_email = user_email_param;
    
    -- Convert to USD using sell rate (what user would get if selling)
    usd_value := convert_gic_to_usd(COALESCE(gic_balance, 0));
    
    RETURN usd_value;
END;
$$ LANGUAGE plpgsql;

-- 7. Add GIC pricing columns to rank_bonus_distributions
ALTER TABLE rank_bonus_distributions 
ADD COLUMN IF NOT EXISTS gic_buy_rate_pesos DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS gic_sell_rate_pesos DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS peso_to_usd_rate DECIMAL(10, 4);

-- 8. Update token exchange rates to reflect GIC peso pricing
UPDATE token_exchange_rates 
SET usd_rate = (
    SELECT buy_rate_usd 
    FROM gic_token_pricing 
    WHERE is_active = TRUE 
    ORDER BY created_at DESC 
    LIMIT 1
),
updated_at = NOW()
WHERE token_symbol = 'GIC' AND is_active = TRUE;

-- 9. Function to update GIC pricing
CREATE OR REPLACE FUNCTION update_gic_pricing(
    new_buy_rate_pesos DECIMAL(10, 2),
    new_sell_rate_pesos DECIMAL(10, 2),
    new_peso_to_usd_rate DECIMAL(10, 4)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Deactivate old pricing
    UPDATE gic_token_pricing
    SET is_active = FALSE, updated_at = NOW()
    WHERE is_active = TRUE;
    
    -- Insert new pricing
    INSERT INTO gic_token_pricing (
        buy_rate_pesos,
        sell_rate_pesos,
        peso_to_usd_rate,
        is_active
    ) VALUES (
        new_buy_rate_pesos,
        new_sell_rate_pesos,
        new_peso_to_usd_rate,
        TRUE
    );
    
    -- Update token exchange rates table for consistency
    UPDATE token_exchange_rates 
    SET usd_rate = new_buy_rate_pesos * new_peso_to_usd_rate,
        updated_at = NOW()
    WHERE token_symbol = 'GIC' AND is_active = TRUE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. View for easy GIC pricing management
CREATE OR REPLACE VIEW current_gic_pricing AS
SELECT 
    buy_rate_pesos,
    sell_rate_pesos,
    peso_to_usd_rate,
    buy_rate_usd,
    sell_rate_usd,
    created_at,
    updated_at
FROM gic_token_pricing
WHERE is_active = TRUE
ORDER BY created_at DESC
LIMIT 1;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON gic_token_pricing TO authenticated;
GRANT SELECT ON current_gic_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION get_gic_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION convert_gic_to_usd TO authenticated;
GRANT EXECUTE ON FUNCTION convert_usd_to_gic TO authenticated;
GRANT EXECUTE ON FUNCTION process_rank_bonus_with_gic_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION get_gic_wallet_usd_value TO authenticated;
GRANT EXECUTE ON FUNCTION update_gic_pricing TO authenticated;

-- Comments for documentation
COMMENT ON TABLE gic_token_pricing IS 'Stores GIC token pricing in pesos with automatic USD conversion';
COMMENT ON FUNCTION convert_gic_to_usd IS 'Converts GIC tokens to USD using sell rate (60 pesos per GIC)';
COMMENT ON FUNCTION convert_usd_to_gic IS 'Converts USD to GIC tokens using buy rate (63 pesos per GIC)';
COMMENT ON FUNCTION process_rank_bonus_with_gic_pricing IS 'Distributes rank bonuses with proper GIC peso pricing';
COMMENT ON VIEW current_gic_pricing IS 'Shows current active GIC pricing in pesos and USD';
