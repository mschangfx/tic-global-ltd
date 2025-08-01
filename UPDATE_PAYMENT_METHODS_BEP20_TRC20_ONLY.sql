-- =====================================================
-- UPDATE PAYMENT METHODS TO BEP20 AND TRC20 ONLY
-- =====================================================
-- This script updates the payment methods to only support
-- USDT on TRC20 (Tron) and BEP20 (Binance Smart Chain) networks

-- 1. Disable all existing payment methods first
UPDATE public.payment_methods 
SET is_active = false, 
    updated_at = NOW()
WHERE is_active = true;

-- 2. Delete old payment methods that are not BEP20 or TRC20
DELETE FROM public.payment_methods 
WHERE network NOT IN ('TRC20', 'BEP20', 'BSC');

-- 3. Insert/Update BEP20 and TRC20 payment methods
INSERT INTO public.payment_methods (
    name,
    network,
    symbol,
    wallet_address,
    min_deposit,
    max_deposit,
    is_active,
    sort_order,
    created_at,
    updated_at
) VALUES
    -- USDT TRC20 (Tron Network)
    ('USDT', 'TRC20', 'USDT', 'TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ', 10.00, 200000.00, true, 1, NOW(), NOW()),

    -- USDT BEP20 (Binance Smart Chain)
    ('USDT', 'BEP20', 'USDT', '0x61b263d67663acfbf20b4157386405b12a49c920', 10.00, 150000.00, true, 2, NOW(), NOW())

ON CONFLICT (name, network) DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    min_deposit = EXCLUDED.min_deposit,
    max_deposit = EXCLUDED.max_deposit,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- 4. Update method_id based payment methods table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods' AND column_name = 'method_id') THEN
        -- Clear old methods
        DELETE FROM public.payment_methods WHERE method_id NOT IN ('usdt-trc20', 'usdt-bep20');
        
        -- Insert/Update new methods
        INSERT INTO public.payment_methods (
            method_id,
            name,
            type,
            network,
            symbol,
            min_amount,
            max_amount,
            processing_fee_rate,
            processing_time,
            is_active,
            metadata,
            created_at,
            updated_at
        ) VALUES
            ('usdt-trc20', 'USDT TRC20', 'crypto', 'TRC20', 'USDT', 10, 200000, 0.00, '1-3 minutes', true,
             '{"address": "TTrhsfwjmFQwvG784GxKUj2Q3GFv3tX9qQ", "explorer": "https://tronscan.org", "icon": "/img/USDT-TRC20.png"}',
             NOW(), NOW()),

            ('usdt-bep20', 'USDT BEP20', 'crypto', 'BEP20', 'USDT', 10, 150000, 0.00, '3-5 minutes', true,
             '{"address": "0x61b263d67663acfbf20b4157386405b12a49c920", "explorer": "https://bscscan.com", "icon": "/img/USDT-BEP20-1.png"}',
             NOW(), NOW())
        
        ON CONFLICT (method_id) DO UPDATE SET
            name = EXCLUDED.name,
            network = EXCLUDED.network,
            min_amount = EXCLUDED.min_amount,
            max_amount = EXCLUDED.max_amount,
            processing_fee_rate = EXCLUDED.processing_fee_rate,
            processing_time = EXCLUDED.processing_time,
            is_active = EXCLUDED.is_active,
            metadata = EXCLUDED.metadata,
            updated_at = NOW();
    END IF;
END $$;

-- 5. Update any existing deposits/withdrawals to use supported methods only
UPDATE public.deposits 
SET payment_method = CASE 
    WHEN payment_method LIKE '%trc20%' OR payment_method LIKE '%TRC20%' THEN 'usdt-trc20'
    WHEN payment_method LIKE '%bep20%' OR payment_method LIKE '%BEP20%' OR payment_method LIKE '%bsc%' OR payment_method LIKE '%BSC%' THEN 'usdt-bep20'
    ELSE 'usdt-trc20'  -- Default fallback
END
WHERE payment_method IS NOT NULL;

UPDATE public.withdrawals 
SET payment_method = CASE 
    WHEN payment_method LIKE '%trc20%' OR payment_method LIKE '%TRC20%' THEN 'usdt-trc20'
    WHEN payment_method LIKE '%bep20%' OR payment_method LIKE '%BEP20%' OR payment_method LIKE '%bsc%' OR payment_method LIKE '%BSC%' THEN 'usdt-bep20'
    ELSE 'usdt-trc20'  -- Default fallback
END
WHERE payment_method IS NOT NULL;

-- 6. Show updated payment methods
SELECT 
    'Updated Payment Methods:' as section,
    COALESCE(method_id, CONCAT(name, '-', LOWER(network))) as method_id,
    name,
    network,
    symbol,
    COALESCE(min_amount::text, min_deposit::text) as min_amount,
    COALESCE(max_amount::text, max_deposit::text) as max_amount,
    is_active,
    COALESCE(wallet_address, (metadata->>'address')) as wallet_address
FROM public.payment_methods 
WHERE is_active = true
ORDER BY COALESCE(sort_order, 0), name;

-- 7. Verification queries
SELECT 
    'Active Payment Methods Count:' as info,
    COUNT(*) as count
FROM public.payment_methods 
WHERE is_active = true;

SELECT 
    'Supported Networks:' as info,
    STRING_AGG(DISTINCT network, ', ') as networks
FROM public.payment_methods 
WHERE is_active = true;

COMMIT;

-- Success message
SELECT '✅ Payment methods updated successfully! Only BEP20 and TRC20 are now supported.' as result;
