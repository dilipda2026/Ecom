-- 1. Safely drop the old 'wallet_transactions' table if it's using the old schema (user_id instead of wallet_id)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='wallet_transactions' AND column_name='user_id'
  ) THEN
    DROP TABLE public.wallet_transactions CASCADE;
  END IF;
END $$;

-- 2. Create Wallets Table (if not exists)
CREATE TABLE IF NOT EXISTS public.wallets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance decimal(12,2) NOT NULL DEFAULT 0.00,
    total_credit decimal(12,2) NOT NULL DEFAULT 0.00,
    total_debit decimal(12,2) NOT NULL DEFAULT 0.00,
    status text NOT NULL DEFAULT 'unverified',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- KYC Fields
    kyc_name text,
    kyc_email text,
    document_type text,
    kyc_photo_url text,
    pan_card_url text,
    kyc_submitted_at timestamptz,
    kyc_approved_at timestamptz,
    kyc_rejection_reason text,
    UNIQUE(user_id)
);

-- 3. Ensure KYC fields exist just in case the table was created earlier without them
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_name text;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_email text;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS document_type text;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_photo_url text;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS pan_card_url text;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_approved_at timestamptz;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_rejection_reason text;

-- 4. Create the new Wallet Transactions Table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('credit', 'debit')),
    amount decimal(12,2) NOT NULL,
    balance_after decimal(12,2) NOT NULL,
    description text,
    reference_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Row Level Security (RLS)
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist so we can recreate them safely
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Users can view their own wallet"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));
