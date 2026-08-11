-- Migration: Create wallets and wallet_transactions tables matching exact spec

-- 1. Create WALLETS table
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(10,2) NOT NULL DEFAULT 0,
  total_credit numeric(10,2) NOT NULL DEFAULT 0,
  total_debit numeric(10,2) NOT NULL DEFAULT 0,
  credit_limit numeric(10,2) NOT NULL DEFAULT 0,
  credit_used numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallets_user_id_key UNIQUE (user_id)
);

-- 2. Create WALLET_TRANSACTION table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit', 'topup', 'payment')),
  amount numeric(10,2) NOT NULL,
  balance_before numeric(10,2) NOT NULL DEFAULT 0,
  balance_after numeric(10,2) NOT NULL DEFAULT 0,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_reference text,
  description text,
  reference text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure extra columns exist if table was previously created with minimal schema
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS balance_before numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS balance_after numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS description text;

-- 3. Row Level Security Policies
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if needed
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Service role full access on wallets" ON public.wallets;
DROP POLICY IF EXISTS "Service role full access on wallet_transactions" ON public.wallet_transactions;

-- Re-create policies
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on wallets" ON public.wallets FOR ALL USING (true);
CREATE POLICY "Service role full access on wallet_transactions" ON public.wallet_transactions FOR ALL USING (true);
