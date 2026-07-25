-- Add wallet_balance to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance numeric(10,2) NOT NULL DEFAULT 0;
-- Track wallet credit history
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  amount    numeric(10,2) not null,
  type      text not null check (type in ('credit','debit','payment')),
  reference text,
  note      text,
  created_at timestamptz not null default now()
);
-- View wallet balance helper
CREATE OR REPLACE FUNCTION public.get_wallet_balance(uid uuid)
RETURNS numeric(10,2) LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE bal numeric(10,2);
  BEGIN
    SELECT wallet_balance INTO bal FROM public.profiles WHERE id = uid;
    RETURN COALESCE(bal, 0);
  END;
$$;
