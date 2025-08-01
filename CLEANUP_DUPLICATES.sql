-- CLEANUP_DUPLICATES.sql
-- Run this first if you get duplicate constraint errors

-- 1. Check for duplicate transaction_ids
SELECT 
    'Duplicate transaction_ids found:' as status,
    transaction_id,
    COUNT(*) as duplicate_count
FROM public.wallet_transactions 
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. Show details of duplicates
SELECT 
    'Duplicate records details:' as info,
    id,
    user_email,
    transaction_id,
    transaction_type,
    amount,
    created_at
FROM public.wallet_transactions 
WHERE transaction_id IN (
    SELECT transaction_id 
    FROM public.wallet_transactions 
    WHERE transaction_id IS NOT NULL
    GROUP BY transaction_id 
    HAVING COUNT(*) > 1
)
ORDER BY transaction_id, created_at;

-- 3. Clean up duplicates (keeps oldest record for each transaction_id)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete duplicates, keeping only the oldest record for each transaction_id
    WITH duplicates_to_delete AS (
        SELECT id
        FROM public.wallet_transactions 
        WHERE id NOT IN (
            SELECT DISTINCT ON (transaction_id) id
            FROM public.wallet_transactions 
            WHERE transaction_id IS NOT NULL
            ORDER BY transaction_id, created_at ASC
        ) AND transaction_id IS NOT NULL
    )
    DELETE FROM public.wallet_transactions 
    WHERE id IN (SELECT id FROM duplicates_to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate transaction records', deleted_count;
END $$;

-- 4. Update NULL transaction_ids to unique values
UPDATE public.wallet_transactions 
SET transaction_id = 'legacy-' || id::text 
WHERE transaction_id IS NULL;

-- 5. Verify cleanup
SELECT 
    'After cleanup - duplicate check:' as status,
    transaction_id,
    COUNT(*) as count
FROM public.wallet_transactions 
GROUP BY transaction_id 
HAVING COUNT(*) > 1;

-- 6. Show final stats
SELECT 
    'Final wallet_transactions stats:' as info,
    COUNT(*) as total_records,
    COUNT(DISTINCT transaction_id) as unique_transaction_ids,
    COUNT(*) - COUNT(DISTINCT transaction_id) as potential_duplicates
FROM public.wallet_transactions;

SELECT 'Cleanup completed successfully!' as result;
