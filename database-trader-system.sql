-- Trader System Database Schema
-- Execute this in your Supabase SQL Editor

-- Table to track user trader status and requirements
CREATE TABLE IF NOT EXISTS user_trader_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  is_trader BOOLEAN DEFAULT FALSE,
  accounts_activated INTEGER DEFAULT 0,
  required_accounts INTEGER DEFAULT 25,
  trader_activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track GIC token trading transactions
CREATE TABLE IF NOT EXISTS gic_trading_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  gic_amount DECIMAL(18, 8) NOT NULL,
  usd_amount DECIMAL(18, 2) NOT NULL,
  price_per_token DECIMAL(18, 2) NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track user GIC token balances
CREATE TABLE IF NOT EXISTS user_gic_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  gic_balance DECIMAL(18, 8) DEFAULT 0,
  total_bought DECIMAL(18, 8) DEFAULT 0,
  total_sold DECIMAL(18, 8) DEFAULT 0,
  total_usd_spent DECIMAL(18, 2) DEFAULT 0,
  total_usd_earned DECIMAL(18, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track account packages (for the 25 account requirement)
CREATE TABLE IF NOT EXISTS user_account_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  package_type TEXT NOT NULL DEFAULT 'usd_2.50_package',
  package_price DECIMAL(10, 2) DEFAULT 2.50,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_trader_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE gic_trading_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gic_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_trader_status
CREATE POLICY "Users can view own trader status" ON user_trader_status
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update own trader status" ON user_trader_status
  FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

-- RLS Policies for gic_trading_transactions
CREATE POLICY "Users can view own GIC transactions" ON gic_trading_transactions
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert own GIC transactions" ON gic_trading_transactions
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- RLS Policies for user_gic_balances
CREATE POLICY "Users can view own GIC balance" ON user_gic_balances
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update own GIC balance" ON user_gic_balances
  FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

-- RLS Policies for user_account_packages
CREATE POLICY "Users can view own account packages" ON user_account_packages
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert own account packages" ON user_account_packages
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Function to check if user can become trader
CREATE OR REPLACE FUNCTION check_trader_eligibility(user_email_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_accounts INTEGER;
  current_status RECORD;
  result JSON;
BEGIN
  -- Get current trader status
  SELECT * INTO current_status
  FROM user_trader_status
  WHERE user_email = user_email_param;

  -- Count active account packages
  SELECT COUNT(*) INTO active_accounts
  FROM user_account_packages
  WHERE user_email = user_email_param
  AND status = 'active'
  AND package_type = 'usd_2.50_package';

  -- Create trader status record if doesn't exist
  IF current_status IS NULL THEN
    INSERT INTO user_trader_status (user_email, accounts_activated)
    VALUES (user_email_param, active_accounts);
    
    SELECT * INTO current_status
    FROM user_trader_status
    WHERE user_email = user_email_param;
  ELSE
    -- Update accounts count
    UPDATE user_trader_status
    SET accounts_activated = active_accounts,
        updated_at = NOW()
    WHERE user_email = user_email_param;
  END IF;

  -- Check if eligible to become trader
  IF active_accounts >= 25 AND NOT current_status.is_trader THEN
    -- Activate trader status
    UPDATE user_trader_status
    SET is_trader = TRUE,
        trader_activated_at = NOW(),
        updated_at = NOW()
    WHERE user_email = user_email_param;

    result := json_build_object(
      'eligible', true,
      'is_trader', true,
      'accounts_activated', active_accounts,
      'required_accounts', 25,
      'just_activated', true,
      'message', 'Congratulations! You are now a trader!'
    );
  ELSE
    result := json_build_object(
      'eligible', active_accounts >= 25,
      'is_trader', COALESCE(current_status.is_trader, false),
      'accounts_activated', active_accounts,
      'required_accounts', 25,
      'just_activated', false,
      'accounts_needed', GREATEST(0, 25 - active_accounts),
      'message', CASE 
        WHEN active_accounts >= 25 THEN 'You are already a trader!'
        ELSE 'You need ' || (25 - active_accounts) || ' more accounts to become a trader.'
      END
    );
  END IF;

  RETURN result;
END;
$$;

-- Function to process GIC token trading
CREATE OR REPLACE FUNCTION process_gic_trade(
  user_email_param TEXT,
  trade_type_param TEXT,
  gic_amount_param DECIMAL,
  usd_amount_param DECIMAL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_wallet RECORD;
  user_gic RECORD;
  trader_status RECORD;
  price_per_token DECIMAL;
  transaction_id UUID;
  result JSON;
BEGIN
  -- Check if user is a trader
  SELECT * INTO trader_status
  FROM user_trader_status
  WHERE user_email = user_email_param;

  IF trader_status IS NULL OR NOT trader_status.is_trader THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You must be a trader to trade GIC tokens'
    );
  END IF;

  -- Get user wallet
  SELECT * INTO user_wallet
  FROM user_wallets
  WHERE user_email = user_email_param;

  IF user_wallet IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User wallet not found'
    );
  END IF;

  -- Get or create user GIC balance
  SELECT * INTO user_gic
  FROM user_gic_balances
  WHERE user_email = user_email_param;

  IF user_gic IS NULL THEN
    INSERT INTO user_gic_balances (user_email)
    VALUES (user_email_param);

    SELECT * INTO user_gic
    FROM user_gic_balances
    WHERE user_email = user_email_param;
  END IF;

  -- Set prices ($1.15 USD buy, $1.10 USD sell)
  IF trade_type_param = 'buy' THEN
    price_per_token := 1.15;

    -- Check if user has enough USD balance
    IF user_wallet.total_balance < usd_amount_param THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Insufficient USD balance'
      );
    END IF;

    -- Process buy transaction
    UPDATE user_wallets
    SET total_balance = total_balance - usd_amount_param,
        updated_at = NOW()
    WHERE user_email = user_email_param;

    UPDATE user_gic_balances
    SET gic_balance = gic_balance + gic_amount_param,
        total_bought = total_bought + gic_amount_param,
        total_usd_spent = total_usd_spent + usd_amount_param,
        updated_at = NOW()
    WHERE user_email = user_email_param;

  ELSIF trade_type_param = 'sell' THEN
    price_per_token := 1.10;

    -- Check if user has enough GIC tokens
    IF user_gic.gic_balance < gic_amount_param THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Insufficient GIC token balance'
      );
    END IF;

    -- Process sell transaction
    UPDATE user_gic_balances
    SET gic_balance = gic_balance - gic_amount_param,
        total_sold = total_sold + gic_amount_param,
        total_usd_earned = total_usd_earned + usd_amount_param,
        updated_at = NOW()
    WHERE user_email = user_email_param;

    UPDATE user_wallets
    SET total_balance = total_balance + usd_amount_param,
        updated_at = NOW()
    WHERE user_email = user_email_param;

  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid trade type'
    );
  END IF;

  -- Record transaction
  INSERT INTO gic_trading_transactions (
    user_email,
    transaction_type,
    gic_amount,
    usd_amount,
    price_per_token,
    status
  ) VALUES (
    user_email_param,
    trade_type_param,
    gic_amount_param,
    usd_amount_param,
    price_per_token,
    'completed'
  ) RETURNING id INTO transaction_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', transaction_id,
    'trade_type', trade_type_param,
    'gic_amount', gic_amount_param,
    'usd_amount', usd_amount_param,
    'price_per_token', price_per_token,
    'message', 'Trade completed successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error processing trade: ' || SQLERRM
    );
END;
$$;

-- Function to get user's GIC trading summary
CREATE OR REPLACE FUNCTION get_user_gic_summary(user_email_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gic_balance RECORD;
  trader_status RECORD;
  recent_transactions RECORD[];
  result JSON;
BEGIN
  -- Get GIC balance
  SELECT * INTO gic_balance
  FROM user_gic_balances
  WHERE user_email = user_email_param;

  -- Get trader status
  SELECT * INTO trader_status
  FROM user_trader_status
  WHERE user_email = user_email_param;

  -- Get recent transactions
  SELECT array_agg(
    json_build_object(
      'id', id,
      'type', transaction_type,
      'gic_amount', gic_amount,
      'usd_amount', usd_amount,
      'price_per_token', price_per_token,
      'created_at', created_at
    )
  ) INTO recent_transactions
  FROM (
    SELECT * FROM gic_trading_transactions
    WHERE user_email = user_email_param
    ORDER BY created_at DESC
    LIMIT 10
  ) recent;

  RETURN json_build_object(
    'is_trader', COALESCE(trader_status.is_trader, false),
    'accounts_activated', COALESCE(trader_status.accounts_activated, 0),
    'gic_balance', COALESCE(gic_balance.gic_balance, 0),
    'total_bought', COALESCE(gic_balance.total_bought, 0),
    'total_sold', COALESCE(gic_balance.total_sold, 0),
    'total_usd_spent', COALESCE(gic_balance.total_usd_spent, 0),
    'total_usd_earned', COALESCE(gic_balance.total_usd_earned, 0),
    'recent_transactions', COALESCE(recent_transactions, ARRAY[]::RECORD[]),
    'current_prices', json_build_object(
      'buy_price', 1.15,
      'sell_price', 1.10
    )
  );
END;
$$;

-- Function to activate account package
CREATE OR REPLACE FUNCTION activate_account_package(
  user_email_param TEXT,
  package_count_param INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_wallet RECORD;
  total_cost DECIMAL;
  i INTEGER;
  result JSON;
BEGIN
  -- Get user wallet
  SELECT * INTO user_wallet
  FROM user_wallets
  WHERE user_email = user_email_param;

  IF user_wallet IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User wallet not found'
    );
  END IF;

  -- Calculate total cost ($2.50 USD per package)
  total_cost := package_count_param * 2.50;

  -- Check if user has enough balance
  IF user_wallet.total_balance < total_cost THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient balance. Need $' || total_cost || ' but have $' || user_wallet.total_balance
    );
  END IF;

  -- Deduct from wallet
  UPDATE user_wallets
  SET total_balance = total_balance - total_cost,
      updated_at = NOW()
  WHERE user_email = user_email_param;

  -- Add account packages
  FOR i IN 1..package_count_param LOOP
    INSERT INTO user_account_packages (
      user_email,
      package_type,
      package_price,
      status,
      activated_at,
      expires_at
    ) VALUES (
      user_email_param,
      'usd_2.50_package',
      2.50,
      'active',
      NOW(),
      NOW() + INTERVAL '1 year'
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'packages_activated', package_count_param,
    'total_cost', total_cost,
    'message', 'Successfully activated ' || package_count_param || ' account packages'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error activating packages: ' || SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_trader_eligibility(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_gic_trade(TEXT, TEXT, DECIMAL, DECIMAL) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_gic_summary(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION activate_account_package(TEXT, INTEGER) TO authenticated, service_role;
