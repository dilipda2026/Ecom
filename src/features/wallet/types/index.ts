export interface Wallet {
  id: string;
  restaurant_id?: string | null;
  user_id: string;
  balance: number;
  total_credit: number;
  total_debit: number;
  credit_limit: number;
  credit_used: number;
  status: 'active' | 'frozen' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  restaurant_id?: string | null;
  wallet_id?: string | null;
  user_id: string;
  type: 'credit' | 'debit' | 'topup' | 'payment';
  amount: number;
  balance_before: number;
  balance_after: number;
  order_id?: string | null;
  payment_reference?: string | null;
  description?: string | null;
  reference?: string | null;
  note?: string | null;
  created_at: string;
}

export interface WalletSummary {
  wallet: Wallet | null;
  balance: number;
  totalCredit: number;
  totalDebit: number;
  transactions: WalletTransaction[];
}
