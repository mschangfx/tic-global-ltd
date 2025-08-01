# Supabase Setup for TIC Global Website

## Required Tables for Deposit System

### 1. Create `transactions` table

```sql
-- Create transactions table
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    network TEXT NOT NULL,
    wallet_address TEXT,
    user_wallet_address TEXT,
    processing_fee DECIMAL(10,2) DEFAULT 0,
    network_fee DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
    user_agent TEXT,
    request_metadata JSONB,
    admin_notes TEXT,
    admin_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_email ON public.transactions(user_email);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert their own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);
```

### 2. Create `admin_notifications` table

```sql
-- Create admin notifications table
CREATE TABLE public.admin_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id),
    user_email TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_admin_notifications_read ON public.admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at);
CREATE INDEX idx_admin_notifications_transaction_id ON public.admin_notifications(transaction_id);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admin can view all notifications" ON public.admin_notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

### 3. Create helper functions

```sql
-- Function to get pending transactions
CREATE OR REPLACE FUNCTION get_pending_transactions()
RETURNS TABLE (
    id UUID,
    user_email TEXT,
    transaction_type TEXT,
    amount DECIMAL,
    currency TEXT,
    network TEXT,
    wallet_address TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        t.id,
        t.user_email,
        t.transaction_type,
        t.amount,
        t.currency,
        t.network,
        t.wallet_address,
        t.status,
        t.created_at
    FROM public.transactions t
    WHERE t.status = 'pending'
    ORDER BY t.created_at DESC;
$$;

-- Function to update transaction status
CREATE OR REPLACE FUNCTION update_transaction_status(
    transaction_id_param UUID,
    new_status TEXT,
    admin_email TEXT,
    admin_notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.transactions
    SET 
        status = new_status,
        admin_email = admin_email,
        admin_notes = admin_notes_param,
        updated_at = NOW()
    WHERE id = transaction_id_param;
    
    RETURN FOUND;
END;
$$;

-- Function to get admin notifications
CREATE OR REPLACE FUNCTION get_admin_notifications(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    notification_type TEXT,
    title TEXT,
    message TEXT,
    transaction_id UUID,
    user_email TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        n.id,
        n.notification_type,
        n.title,
        n.message,
        n.transaction_id,
        n.user_email,
        n.is_read,
        n.created_at
    FROM public.admin_notifications n
    ORDER BY n.created_at DESC
    LIMIT limit_count;
$$;
```

### 4. Environment Variables

Make sure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. Test the Setup

After creating the tables, you can test with:

```sql
-- Test insert
INSERT INTO public.transactions (
    user_email,
    transaction_type,
    amount,
    network,
    wallet_address
) VALUES (
    'test@example.com',
    'deposit',
    100.00,
    'TRC20',
    'TEHq42c1Kyhe7ShAWYDS61c7aYKNPsT8PF'
);

-- Test select
SELECT * FROM public.transactions WHERE user_email = 'test@example.com';
```

## Quick Setup Steps:

1. **Go to your Supabase dashboard**
2. **Open SQL Editor**
3. **Run the SQL commands above** (one section at a time)
4. **Check that tables are created** in the Table Editor
5. **Verify your environment variables** are correct
6. **Test the deposit flow** in your application

## Troubleshooting:

- **Permission errors**: Make sure RLS policies are set correctly
- **Connection errors**: Verify your environment variables
- **Function errors**: Check that all functions are created successfully
- **Insert errors**: Verify table structure matches the code

After setting up these tables, your deposit system should work properly!
