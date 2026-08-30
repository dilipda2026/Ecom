'use server';

import { createServiceClient } from '@/infrastructure/supabase/service';
import { getServerSession } from '@/features/auth/actions';
import { getAdminEmails } from '@/lib/settings';
import { isAdminEmail } from '@/config/auth-access';
import {
  expenseTransactionSchema,
  updateExpenseTransactionSchema,
  startingBalanceSchema,
} from '../schemas';
import type {
  ExpenseSummary,
  DateFilterType,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseTransaction,
} from '../types';

async function authorizeAdmin() {
  const { user } = await getServerSession();
  if (!user) return { authorized: false, error: 'Not authenticated', userId: null };

  const supabase = createServiceClient();
  if (!supabase) return { authorized: false, error: 'Database service unavailable', userId: null };

  const adminEmails = await getAdminEmails();
  const isAdminByEmail = isAdminEmail(user.email, adminEmails);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isUserAdmin =
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin' ||
    isAdminByEmail;

  if (!isUserAdmin) {
    return { authorized: false, error: 'Forbidden. Admin access required.', userId: null };
  }

  return { authorized: true, userId: user.id, supabase };
}

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(filter: DateFilterType, customStart?: string, customEnd?: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  const todayStr = formatDateISO(now);

  switch (filter) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDateISO(y);
      return { startDate: yStr, endDate: yStr };
    }
    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1 - day);
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { startDate: formatDateISO(monday), endDate: formatDateISO(sunday) };
    }
    case 'this_month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: formatDateISO(firstDay), endDate: formatDateISO(lastDay) };
    }
    case 'custom':
      return { startDate: customStart, endDate: customEnd };
    case 'all':
    default:
      return {};
  }
}

/**
 * Fetch complete expense summary, starting balance, period metrics, and running balances
 */
export async function getExpenseSummary(
  filter: DateFilterType = 'all',
  customStart?: string,
  customEnd?: string
): Promise<{ success: boolean; data?: ExpenseSummary; error?: string }> {
  const auth = await authorizeAdmin();
  if (!auth.authorized || !auth.supabase || !auth.userId) {
    return { success: false, error: auth.error };
  }
  const { supabase, userId } = auth;

  try {
    // 1. Fetch starting balance
    let startingBalance = 0;
    try {
      const { data: settingsData } = await supabase
        .from('expense_settings')
        .select('starting_balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsData) {
        startingBalance = Number(settingsData.starting_balance) || 0;
      }
    } catch {
      // Table may not exist yet or empty
    }

    // 2. Fetch ALL transactions sorted chronologically (ASC) to calculate running balance
    const { data: allRaw, error: fetchErr } = await supabase
      .from('expense_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (fetchErr) {
      console.error('Error fetching expense transactions:', fetchErr);
      return { success: false, error: 'Failed to fetch transactions' };
    }

    let running = startingBalance;
    let totalIncome = 0;
    let totalExpenses = 0;

    const allCalculated: ExpenseTransaction[] = (allRaw || []).map((raw) => {
      const amount = Number(raw.amount) || 0;
      const type = raw.type as 'income' | 'expense';

      if (type === 'income') {
        running += amount;
        totalIncome += amount;
      } else {
        running -= amount;
        totalExpenses += amount;
      }

      return {
        id: raw.id,
        user_id: raw.user_id,
        transaction_date: raw.transaction_date,
        description: raw.description,
        amount,
        type,
        note: raw.note ?? null,
        running_balance: running,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
      };
    });

    const overallAvailableBalance = running;

    // 3. Apply date filter
    const { startDate, endDate } = getDateRange(filter, customStart, customEnd);

    const filteredTransactions = allCalculated.filter((tx) => {
      if (startDate && tx.transaction_date < startDate) return false;
      if (endDate && tx.transaction_date > endDate) return false;
      return true;
    });

    // 4. Calculate period totals
    let periodIncome = 0;
    let periodExpenses = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') {
        periodIncome += tx.amount;
      } else {
        periodExpenses += tx.amount;
      }
    });

    const periodNet = periodIncome - periodExpenses;

    // 5. Sort display transactions DESC (most recent first)
    const sortedFiltered = [...filteredTransactions].sort((a, b) => {
      if (a.transaction_date !== b.transaction_date) {
        return b.transaction_date.localeCompare(a.transaction_date);
      }
      return b.created_at.localeCompare(a.created_at);
    });

    return {
      success: true,
      data: {
        startingBalance,
        overallAvailableBalance,
        totalIncome,
        totalExpenses,
        periodIncome,
        periodExpenses,
        periodNet,
        transactions: sortedFiltered,
        filter,
        customStart,
        customEnd,
      },
    };
  } catch (err: unknown) {
    console.error('getExpenseSummary error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch expense summary',
    };
  }
}

/**
 * Set or update user's initial starting balance
 */
export async function updateStartingBalance(
  startingBalance: number
): Promise<{ success: boolean; error?: string }> {
  const auth = await authorizeAdmin();
  if (!auth.authorized || !auth.supabase || !auth.userId) {
    return { success: false, error: auth.error };
  }
  const { supabase, userId } = auth;

  const parsed = startingBalanceSchema.safeParse({ starting_balance: startingBalance });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid starting balance' };
  }

  try {
    const { data: existing } = await supabase
      .from('expense_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('expense_settings')
        .update({
          starting_balance: parsed.data.starting_balance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateErr) {
        console.error('updateStartingBalance update error:', updateErr);
        return { success: false, error: updateErr.message || 'Failed to update starting balance' };
      }
    } else {
      const { error: insertErr } = await supabase.from('expense_settings').insert({
        user_id: userId,
        starting_balance: parsed.data.starting_balance,
      });

      if (insertErr) {
        console.error('updateStartingBalance insert error:', insertErr);
        return { success: false, error: insertErr.message || 'Failed to insert starting balance' };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('updateStartingBalance error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update starting balance',
    };
  }
}

/**
 * Add a new income or expense transaction
 */
export async function addExpenseTransaction(
  input: CreateExpenseInput
): Promise<{ success: boolean; error?: string }> {
  const auth = await authorizeAdmin();
  if (!auth.authorized || !auth.supabase || !auth.userId) {
    return { success: false, error: auth.error };
  }
  const { supabase, userId } = auth;

  const parsed = expenseTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid transaction data' };
  }

  try {
    const { error: insertErr } = await supabase.from('expense_transactions').insert({
      user_id: userId,
      transaction_date: parsed.data.transaction_date,
      description: parsed.data.description,
      amount: parsed.data.amount,
      type: parsed.data.type,
      note: parsed.data.note ?? null,
    });

    if (insertErr) {
      console.error('addExpenseTransaction insert error:', insertErr);
      return { success: false, error: insertErr.message || 'Failed to add transaction' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('addExpenseTransaction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add transaction',
    };
  }
}

/**
 * Edit an existing transaction
 */
export async function updateExpenseTransaction(
  id: string,
  input: UpdateExpenseInput
): Promise<{ success: boolean; error?: string }> {
  const auth = await authorizeAdmin();
  if (!auth.authorized || !auth.supabase || !auth.userId) {
    return { success: false, error: auth.error };
  }
  const { supabase, userId } = auth;

  if (!id) return { success: false, error: 'Transaction ID is required' };

  const parsed = updateExpenseTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid transaction update data' };
  }

  try {
    const { error: updateErr } = await supabase
      .from('expense_transactions')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (updateErr) {
      console.error('updateExpenseTransaction update error:', updateErr);
      return { success: false, error: updateErr.message || 'Failed to update transaction' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('updateExpenseTransaction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update transaction',
    };
  }
}

/**
 * Delete a transaction
 */
export async function deleteExpenseTransaction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await authorizeAdmin();
  if (!auth.authorized || !auth.supabase || !auth.userId) {
    return { success: false, error: auth.error };
  }
  const { supabase, userId } = auth;

  if (!id) return { success: false, error: 'Transaction ID is required' };

  try {
    const { error: deleteErr } = await supabase
      .from('expense_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteErr) {
      console.error('deleteExpenseTransaction delete error:', deleteErr);
      return { success: false, error: deleteErr.message || 'Failed to delete transaction' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('deleteExpenseTransaction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete transaction',
    };
  }
}
