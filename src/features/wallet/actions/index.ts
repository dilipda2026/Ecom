'use server';

import { createServiceClient } from '@/infrastructure/supabase/service';
import { getServerSession } from '@/features/auth/actions';
import type { WalletTransaction } from '../types';

export async function getWalletBalance() {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable', balance: 0 };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Not authenticated', balance: 0 };

  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return { success: true, balance: 0 };
  return { success: true, balance: Number(data.wallet_balance) || 0 };
}

export async function getWalletTransactions(page = 1, pageSize = 20) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable', data: null };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Not authenticated', data: null };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return { success: false, error: 'Failed to fetch', data: null };

  return {
    success: true,
    data: {
      transactions: data as WalletTransaction[],
      total: count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  };
}

export async function adminCreditWallet(userId: string, amount: number, note: string) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user: admin } = await getServerSession();
  if (!admin) return { success: false, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', admin.id)
    .maybeSingle();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Forbidden' };
  }

  if (amount <= 0) return { success: false, error: 'Amount must be positive' };

  const { data: current } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .maybeSingle();

  const currentBalance = Number(current?.wallet_balance) || 0;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ wallet_balance: currentBalance + amount })
    .eq('id', userId);

  if (updateError) return { success: false, error: 'Failed to credit wallet' };

  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    amount,
    type: 'credit',
    note: note || 'Credited by admin',
    reference: `admin:${admin.id}`,
  });

  return { success: true, balance: currentBalance + amount };
}

export async function deductWalletBalance(amount: number, orderId: string) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Not authenticated' };

  const userId = user.id;

  const { data: current } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .maybeSingle();

  const currentBalance = Number(current?.wallet_balance) || 0;
  if (currentBalance < amount) return { success: false, error: 'Insufficient wallet balance' };

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ wallet_balance: currentBalance - amount })
    .eq('id', userId);

  if (updateError) return { success: false, error: 'Failed to deduct wallet' };

  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    amount: -amount,
    type: 'payment',
    reference: orderId,
    note: `Payment for order ${orderId}`,
  });

  return { success: true, balance: currentBalance - amount };
}
