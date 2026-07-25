export interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'credit' | 'debit' | 'payment';
  reference: string | null;
  note: string | null;
  created_at: string;
}
