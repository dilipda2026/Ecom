-- Add KYC columns to the existing wallets table
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_name text;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_photo_url text;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS pan_card_url text;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_approved_at timestamptz;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_rejection_reason text;

ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS kyc_email text;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS document_type text;

-- Change the default status for new wallets so they don't become active automatically
ALTER TABLE public.wallets ALTER COLUMN status SET DEFAULT 'unverified';
