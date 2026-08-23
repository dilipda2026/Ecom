ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_email text;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS document_type text;
