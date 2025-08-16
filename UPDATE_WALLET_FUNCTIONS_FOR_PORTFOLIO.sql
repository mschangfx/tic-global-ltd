-- Update wallet functions to properly handle portfolio_value for external transactions
-- This ensures the portfolio value only changes with deposits, withdrawals, and transfers to other users
-- Internal transfers between own wallets do NOT affect portfolio_value

-- 1. Update debit_user_wallet function to handle portfolio_value for external transactions
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
    current_portfolio_value DECIMAL(18, 8);
    new_portfolio_value DECIMAL(18, 8);
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

    -- Calculate new total balance
    new_total := wallet_record.total_balance - amount_param;

    -- Handle portfolio_value for external transactions only
    current_portfolio_value := COALESCE(wallet_record.portfolio_value, 0);
    
    -- Only update portfolio_value for external transactions (withdrawals, transfers to other users)
    -- Internal transfers between own wallets should NOT affect portfolio_value
    IF transaction_type_param IN ('withdrawal', 'transfer_to_user', 'payment_external') THEN
        new_portfolio_value := current_portfolio_value - amount_param;
        -- Ensure portfolio value doesn't go negative
        IF new_portfolio_value < 0 THEN
            new_portfolio_value := 0;
        END IF;
        
        RAISE NOTICE 'External transaction: Portfolio value updated from % to % (change: -%)', 
                     current_portfolio_value, new_portfolio_value, amount_param;
    ELSE
        -- For internal transactions, keep portfolio_value unchanged
        new_portfolio_value := current_portfolio_value;
        RAISE NOTICE 'Internal transaction: Portfolio value unchanged at %', current_portfolio_value;
    END IF;

    -- Update wallet balance and portfolio_value
    UPDATE user_wallets 
    SET 
        total_balance = new_total,
        portfolio_value = new_portfolio_value,
        last_updated = NOW()
    WHERE user_email = user_email_param;

    -- Record transaction
    INSERT INTO wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        metadata,
        created_at
    ) VALUES (
        user_email_param,
        transaction_id_param::TEXT,
        transaction_type_param,
        amount_param,
        wallet_record.total_balance,
        new_total,
        description_param,
        jsonb_build_object(
            'portfolio_value_before', current_portfolio_value,
            'portfolio_value_after', new_portfolio_value,
            'portfolio_value_changed', (transaction_type_param IN ('withdrawal', 'transfer_to_user', 'payment_external'))
        ),
        NOW()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 2. Update credit_user_wallet function to handle portfolio_value for external transactions
CREATE OR REPLACE FUNCTION credit_user_wallet(
    user_email_param VARCHAR(255),
    amount_param DECIMAL(18, 8),
    transaction_id_param UUID,
    transaction_type_param VARCHAR(20) DEFAULT 'deposit',
    description_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(18, 8);
    new_balance DECIMAL(18, 8);
    current_portfolio_value DECIMAL(18, 8);
    new_portfolio_value DECIMAL(18, 8);
    wallet_exists BOOLEAN;
BEGIN
    -- Check if wallet exists
    SELECT EXISTS(SELECT 1 FROM user_wallets WHERE user_email = user_email_param) INTO wallet_exists;
    
    IF NOT wallet_exists THEN
        -- Create wallet with initial portfolio value for new users
        INSERT INTO user_wallets (
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
            amount_param, 
            0, 0, 0, 0,
            amount_param, -- Initial portfolio value equals first deposit
            NOW()
        );
        
        current_balance := 0;
        new_balance := amount_param;
        current_portfolio_value := 0;
        new_portfolio_value := amount_param;
    ELSE
        -- Get current balances
        SELECT total_balance, COALESCE(portfolio_value, 0) 
        INTO current_balance, current_portfolio_value 
        FROM user_wallets 
        WHERE user_email = user_email_param;
        
        -- Calculate new balances
        new_balance := current_balance + amount_param;
        
        -- Only update portfolio_value for external transactions (deposits, transfers from other users)
        -- Internal transfers between own wallets should NOT affect portfolio_value
        IF transaction_type_param IN ('deposit', 'transfer_from_user', 'bonus', 'refund') THEN
            new_portfolio_value := current_portfolio_value + amount_param;
            RAISE NOTICE 'External credit: Portfolio value updated from % to % (change: +%)', 
                         current_portfolio_value, new_portfolio_value, amount_param;
        ELSE
            -- For internal transactions, keep portfolio_value unchanged
            new_portfolio_value := current_portfolio_value;
            RAISE NOTICE 'Internal credit: Portfolio value unchanged at %', current_portfolio_value;
        END IF;
        
        -- Update wallet balance and portfolio_value
        UPDATE user_wallets 
        SET 
            total_balance = new_balance,
            portfolio_value = new_portfolio_value,
            last_updated = NOW()
        WHERE user_email = user_email_param;
    END IF;
    
    -- Record transaction
    INSERT INTO wallet_transactions (
        user_email,
        transaction_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        metadata,
        created_at
    ) VALUES (
        user_email_param,
        transaction_id_param::TEXT,
        transaction_type_param,
        amount_param,
        current_balance,
        new_balance,
        description_param,
        jsonb_build_object(
            'portfolio_value_before', current_portfolio_value,
            'portfolio_value_after', new_portfolio_value,
            'portfolio_value_changed', (transaction_type_param IN ('deposit', 'transfer_from_user', 'bonus', 'refund'))
        ),
        NOW()
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant necessary permissions
GRANT EXECUTE ON FUNCTION debit_user_wallet(VARCHAR(255), DECIMAL(18, 8), UUID, VARCHAR(20), TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION debit_user_wallet(VARCHAR(255), DECIMAL(18, 8), UUID, VARCHAR(20), TEXT) TO anon;
GRANT EXECUTE ON FUNCTION credit_user_wallet(VARCHAR(255), DECIMAL(18, 8), UUID, VARCHAR(20), TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION credit_user_wallet(VARCHAR(255), DECIMAL(18, 8), UUID, VARCHAR(20), TEXT) TO anon;
