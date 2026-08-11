'use server';

import { createServiceClient } from '@/infrastructure/supabase/service';
import { getServerSession } from '@/features/auth/actions';
import type { Wallet, WalletTransaction, WalletSummary } from '../types';

/**
 * Fetch full wallet details for current authenticated user
 */
export async function getWalletDetails(): Promise<{
  success: boolean;
  error?: string;
  data?: WalletSummary;
}> {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Database service unavailable' };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Not authenticated' };

  try {
    // 1. Fetch user's profile wallet balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .maybeSingle();

    const profileBalance = Number(profile?.wallet_balance) || 0;

    // 2. Fetch or create record in `wallets` table (if table exists)
    let walletRecord: Wallet | null = null;
    try {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletData) {
        walletRecord = walletData as Wallet;
      }
    } catch {
      // Table wallets may not exist yet
    }

    // 3. Fetch transaction history
    let rawTransactions: any[] = [];
    try {
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (txData) rawTransactions = txData;
    } catch {
      // Table wallet_transactions issue
    }

    // Normalize transaction list
    const transactions: WalletTransaction[] = rawTransactions.map((tx) => {
      const isCreditType = ['credit', 'topup'].includes(tx.type) || Number(tx.amount) > 0;
      return {
        id: tx.id,
        restaurant_id: tx.restaurant_id ?? null,
        wallet_id: tx.wallet_id ?? walletRecord?.id ?? null,
        user_id: tx.user_id,
        type: isCreditType ? 'credit' : 'debit',
        amount: Math.abs(Number(tx.amount) || 0),
        balance_before: Number(tx.balance_before) || 0,
        balance_after: Number(tx.balance_after) || 0,
        order_id: tx.order_id ?? (tx.reference?.startsWith('ORD') ? tx.reference : null),
        payment_reference: tx.payment_reference ?? tx.reference ?? null,
        description: tx.description ?? tx.note ?? (isCreditType ? 'Wallet Top Up' : 'Order Payment'),
        reference: tx.reference ?? null,
        note: tx.note ?? null,
        created_at: tx.created_at,
      };
    });

    // Calculate sum of total credits and debits from transactions
    let creditSum = transactions
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    let debitSum = transactions
      .filter((t) => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const currentBalance = profileBalance || Number(walletRecord?.balance) || 0;
    const totalCredit = Math.max(creditSum, currentBalance, Number(walletRecord?.total_credit) || 0);
    const totalDebit = Math.max(debitSum, Number(walletRecord?.total_debit) || 0);

    return {
      success: true,
      data: {
        wallet: walletRecord,
        balance: currentBalance,
        totalCredit,
        totalDebit,
        transactions,
      },
    };
  } catch (err: any) {
    console.error('getWalletDetails error:', err);
    return { success: false, error: err.message || 'Failed to fetch wallet details' };
  }
}

/**
 * Top Up Wallet with a specific amount
 */
export async function topupWallet(
  amount: number,
  paymentReference = 'Instant UPI / GPay'
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!amount || amount <= 0) {
    return { success: false, error: 'Please enter a valid top-up amount' };
  }

  try {
    // Fetch current wallet or profile balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .maybeSingle();

    const balanceBefore = Number(profile?.wallet_balance) || 0;
    const balanceAfter = balanceBefore + amount;

    // 1. Update profiles table
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ wallet_balance: balanceAfter })
      .eq('id', user.id);

    if (profileErr) {
      console.error('Failed updating profile wallet balance:', profileErr);
    }

    // 2. Fetch or update `wallets` table if exists
    let walletId: string | null = null;
    try {
      const { data: existingWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingWallet) {
        walletId = existingWallet.id;
        const updatedTotalCredit = (Number(existingWallet.total_credit) || 0) + amount;
        await supabase
          .from('wallets')
          .update({
            balance: balanceAfter,
            total_credit: updatedTotalCredit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWallet.id);
      } else {
        const { data: newW } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            balance: balanceAfter,
            total_credit: amount,
            total_debit: 0,
            status: 'active',
          })
          .select()
          .maybeSingle();

        if (newW) walletId = newW.id;
      }
    } catch {
      // Ignored if wallets table not yet created
    }

    // 3. Insert transaction record into `wallet_transactions`
    const txnRef = `TOPUP-${Date.now()}`;
    const noteText = `Added ₹${amount} to wallet (${paymentReference})`;
    const descText = `Wallet Top Up (${paymentReference})`;

    // Try full insert first
    const { error: fullInsertErr } = await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      wallet_id: walletId || null,
      type: 'credit',
      amount: amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      payment_reference: txnRef,
      description: descText,
      note: noteText,
      reference: txnRef,
    });

    // If full insert failed due to extra columns missing, fallback to standard schema
    if (fullInsertErr) {
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'credit',
        amount: amount,
        reference: txnRef,
        note: noteText,
      });
    }

    return { success: true, newBalance: balanceAfter };
  } catch (err: any) {
    console.error('topupWallet error:', err);
    return { success: false, error: err.message || 'Failed to top up wallet' };
  }
}

/**
 * Deduct wallet balance (e.g. for order checkout)
 */
export async function deductWalletBalance(
  amount: number,
  orderId: string,
  description = 'Order Payment'
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (!amount || amount <= 0) return { success: false, error: 'Invalid amount' };

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .maybeSingle();

    const balanceBefore = Number(profile?.wallet_balance) || 0;
    if (balanceBefore < amount) {
      return { success: false, error: 'Insufficient wallet balance' };
    }

    const balanceAfter = balanceBefore - amount;

    // 1. Update profiles table
    await supabase
      .from('profiles')
      .update({ wallet_balance: balanceAfter })
      .eq('id', user.id);

    // 2. Update wallets table if exists
    let walletId: string | null = null;
    try {
      const { data: existingWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingWallet) {
        walletId = existingWallet.id;
        const updatedTotalDebit = (Number(existingWallet.total_debit) || 0) + amount;
        await supabase
          .from('wallets')
          .update({
            balance: balanceAfter,
            total_debit: updatedTotalDebit,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWallet.id);
      }
    } catch {
      // Ignored
    }

    // 3. Insert transaction record
    const descText = description || `Payment for order ${orderId}`;
    const noteText = `Deducted ₹${amount} for order ${orderId}`;

    const { error: fullInsertErr } = await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      wallet_id: walletId || null,
      type: 'debit',
      amount: -amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      order_id: orderId,
      description: descText,
      note: noteText,
      reference: orderId,
    });

    if (fullInsertErr) {
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'payment',
        amount: -amount,
        reference: orderId,
        note: noteText,
      });
    }

    return { success: true, newBalance: balanceAfter };
  } catch (err: any) {
    console.error('deductWalletBalance error:', err);
    return { success: false, error: err.message || 'Failed to deduct wallet balance' };
  }
}

/**
 * Legacy exports for backwards compatibility
 */
export async function getWalletBalance() {
  const res = await getWalletDetails();
  return { success: res.success, error: res.error, balance: res.data?.balance || 0 };
}

export async function getWalletTransactions() {
  const res = await getWalletDetails();
  return {
    success: res.success,
    error: res.error,
    data: res.data ? { transactions: res.data.transactions } : null,
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

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .maybeSingle();

  const balanceBefore = Number(userProfile?.wallet_balance) || 0;
  const balanceAfter = balanceBefore + amount;

  await supabase.from('profiles').update({ wallet_balance: balanceAfter }).eq('id', userId);

  let walletId: string | null = null;
  try {
    const { data: w } = await supabase.from('wallets').select('id, total_credit').eq('user_id', userId).maybeSingle();
    if (w) {
      walletId = w.id;
      await supabase.from('wallets').update({
        balance: balanceAfter,
        total_credit: (Number(w.total_credit) || 0) + amount,
        updated_at: new Date().toISOString(),
      }).eq('id', w.id);
    }
  } catch {
    // Ignored
  }

  const txnRef = `admin:${admin.id}`;
  const noteText = note || 'Credited by admin';

  const { error: fullInsertErr } = await supabase.from('wallet_transactions').insert({
    user_id: userId,
    wallet_id: walletId,
    amount,
    type: 'credit',
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    description: noteText,
    note: noteText,
    reference: txnRef,
  });

  if (fullInsertErr) {
    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      amount,
      type: 'credit',
      reference: txnRef,
      note: noteText,
    });
  }

  return { success: true, balance: balanceAfter };
}
