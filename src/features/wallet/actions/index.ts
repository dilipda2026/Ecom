'use server';

import { createServiceClient } from '@/infrastructure/supabase/service';
import { getServerSession } from '@/features/auth/actions';
import { getNumericSetting } from '@/lib/settings';
import type { Wallet, WalletTransaction, WalletSummary } from '../types';

const DEFAULT_CREDIT_LIMIT = 500;

async function getCreditLimit(): Promise<number> {
  return getNumericSetting('wallet_credit_limit', DEFAULT_CREDIT_LIMIT);
}

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
    type RawTransaction = Omit<WalletTransaction, 'amount'> & { amount?: number | string | null; reference_id?: string | null };
    let rawTransactions: RawTransaction[] = [];
    try {
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletRecord?.id || '00000000-0000-0000-0000-000000000000')
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
        user_id: user.id, // User id is derived
        type: isCreditType ? 'credit' : 'debit',
        amount: Math.abs(Number(tx.amount) || 0),
        balance_before: 0, // No longer stored
        balance_after: Number(tx.balance_after) || 0,
        order_id: tx.reference_id?.startsWith('ORD') ? tx.reference_id : null,
        payment_reference: tx.reference_id ?? null,
        description: tx.description ?? (isCreditType ? 'Wallet Top Up' : 'Order Payment'),
        reference: tx.reference_id ?? null,
        note: null,
        created_at: tx.created_at,
      };
    });

    // Calculate sum of total credits and debits from transactions
    const creditSum = transactions
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const debitSum = transactions
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
        creditLimit: await getCreditLimit(),
        transactions,
      },
    };
  } catch (err: unknown) {
    console.error('getWalletDetails error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch wallet details' };
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
        if (existingWallet.status !== 'active') {
          return { success: false, error: 'Your wallet is not active. Please complete KYC.' };
        }
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
        return { success: false, error: 'Your wallet is not active. Please complete KYC.' };
      }
    } catch {
      // Ignored if wallets table not yet created
    }

    // 3. Insert transaction record into `wallet_transactions`
    const txnRef = `TOPUP-${Date.now()}`;
    const descText = `Wallet Top Up (${paymentReference})`;

    if (walletId) {
      const { error: insertErr } = await supabase.from('wallet_transactions').insert({
        wallet_id: walletId,
        type: 'credit',
        amount: amount,
        balance_after: balanceAfter,
        description: descText,
        reference_id: txnRef,
      });

      if (insertErr) {
        console.error('Wallet transaction insert failed:', insertErr);
      }
    }

    return { success: true, newBalance: balanceAfter };
  } catch (err: unknown) {
    console.error('topupWallet error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to top up wallet' };
  }
}

/**
 * Top up wallet after verifying Razorpay payment signature & payment ID
 */
export async function verifyAndTopupWalletWithRazorpay({
  amount,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature,
}: {
  amount: number;
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  if (!razorpayPaymentId) {
    return { success: false, error: 'Missing Razorpay Payment ID' };
  }

  const { verifyRazorpayPayment } = await import('@/features/payments/actions');

  // Verify Razorpay payment signature server-side
  const verification = await verifyRazorpayPayment(
    razorpayOrderId || '',
    razorpayPaymentId,
    razorpaySignature || ''
  );

  if (!verification.success) {
    return { success: false, error: verification.error || 'Payment verification failed' };
  }

  // Once verified, update wallet balance & insert into tables
  const paymentRef = `Razorpay ID: ${razorpayPaymentId}`;
  return topupWallet(amount, paymentRef);
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

    const CREDIT_LIMIT = await getCreditLimit();
    const balanceBefore = Number(profile?.wallet_balance) || 0;
    if (balanceBefore - amount < -CREDIT_LIMIT) {
      return { success: false, error: `Credit limit reached (-₹${CREDIT_LIMIT}). Available balance: ₹${balanceBefore.toLocaleString('en-IN')}` };
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
        if (existingWallet.status !== 'active') {
          return { success: false, error: 'Your wallet is not active.' };
        }
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

    if (walletId) {
      const { error: insertErr } = await supabase.from('wallet_transactions').insert({
        wallet_id: walletId,
        type: 'debit',
        amount: amount,
        balance_after: balanceAfter,
        description: descText,
        reference_id: orderId,
      });

      if (insertErr) {
        console.error('Wallet transaction insert failed:', insertErr);
      }
    }

    return { success: true, newBalance: balanceAfter };
  } catch (err: unknown) {
    console.error('deductWalletBalance error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to deduct wallet balance' };
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

/**
 * KYC Actions
 */
export async function submitWalletKyc(data: {
  kycName: string;
  kycEmail: string;
  documentType: string;
  kycPhotoUrl: string;
  panCardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Database service unavailable' };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Not authenticated' };

  try {
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingWallet && existingWallet.status === 'active') {
      return { success: false, error: 'Wallet is already active' };
    }

    if (existingWallet) {
      await supabase
        .from('wallets')
        .update({
          kyc_name: data.kycName,
          kyc_email: data.kycEmail,
          document_type: data.documentType,
          kyc_photo_url: data.kycPhotoUrl,
          pan_card_url: data.panCardUrl,
          status: 'pending',
          kyc_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingWallet.id);
    } else {
      await supabase.from('wallets').insert({
        user_id: user.id,
        balance: 0,
        total_credit: 0,
        total_debit: 0,
        status: 'pending',
        kyc_name: data.kycName,
        kyc_email: data.kycEmail,
        document_type: data.documentType,
        kyc_photo_url: data.kycPhotoUrl,
        pan_card_url: data.panCardUrl,
        kyc_submitted_at: new Date().toISOString(),
      });
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('submitWalletKyc error:', err);
    return { success: false, error: 'Failed to submit KYC' };
  }
}

export async function getPendingWalletKycs(): Promise<{ success: boolean; data?: Wallet[]; error?: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user: admin } = await getServerSession();
  if (!admin) return { success: false, error: 'Not authenticated' };

  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', admin.id).maybeSingle();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { success: false, error: 'Forbidden' };
    }

    const { data: kycs, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('status', 'pending')
      .order('kyc_submitted_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: kycs as Wallet[] };
  } catch (err: unknown) {
    console.error('getPendingWalletKycs error:', err);
    return { success: false, error: 'Failed to fetch pending KYCs' };
  }
}

export async function approveWalletKyc(walletId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user: admin } = await getServerSession();
  if (!admin) return { success: false, error: 'Not authenticated' };

  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', admin.id).maybeSingle();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { success: false, error: 'Forbidden' };
    }

    await supabase
      .from('wallets')
      .update({
        status: 'active',
        kyc_approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    return { success: true };
  } catch (err: unknown) {
    console.error('approveWalletKyc error:', err);
    return { success: false, error: 'Failed to approve KYC' };
  }
}

export async function rejectWalletKyc(walletId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user: admin } = await getServerSession();
  if (!admin) return { success: false, error: 'Not authenticated' };

  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', admin.id).maybeSingle();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { success: false, error: 'Forbidden' };
    }

    await supabase
      .from('wallets')
      .update({
        status: 'rejected',
        kyc_rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    return { success: true };
  } catch (err: unknown) {
    console.error('rejectWalletKyc error:', err);
    return { success: false, error: 'Failed to reject KYC' };
  }
}

export async function getAllWallets(): Promise<{ success: boolean; data?: Wallet[]; error?: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user: admin } = await getServerSession();
  if (!admin) return { success: false, error: 'Not authenticated' };

  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', admin.id).maybeSingle();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { success: false, error: 'Forbidden' };
    }

    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: wallets as Wallet[] };
  } catch (err: unknown) {
    console.error('getAllWallets error:', err);
    return { success: false, error: 'Failed to fetch all wallets' };
  }
}

export async function updateWalletStatus(walletId: string, status: Wallet['status']): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user: admin } = await getServerSession();
  if (!admin) return { success: false, error: 'Not authenticated' };

  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', admin.id).maybeSingle();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return { success: false, error: 'Forbidden' };
    }

    const { error } = await supabase
      .from('wallets')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    console.error('updateWalletStatus error:', err);
    return { success: false, error: 'Failed to update wallet status' };
  }
}
