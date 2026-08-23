'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Loader2,
  Filter,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { getExpenseSummary, deleteExpenseTransaction } from '../actions';
import { showToast } from '@/components/shared/Toast';
import StartingBalanceModal from './StartingBalanceModal';
import AddEditExpenseModal from './AddEditExpenseModal';
import type { ExpenseSummary, DateFilterType, ExpenseTransaction } from '../types';

export default function ExpenseTracker() {
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [activeFilter, setActiveFilter] = useState<DateFilterType>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Modals state
  const [isStartingBalanceOpen, setIsStartingBalanceOpen] = useState<boolean>(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<ExpenseTransaction | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getExpenseSummary(activeFilter, customStart, customEnd);
    setLoading(false);

    if (res.success && res.data) {
      setSummary(res.data);
    } else {
      setError(res.error || 'Failed to load expense data');
    }
  }, [activeFilter, customStart, customEnd]);

  useEffect(() => {
    loadData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (tx: ExpenseTransaction) => {
    setEditingTransaction(tx);
    setIsAddEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    setDeletingId(id);
    const res = await deleteExpenseTransaction(id);
    setDeletingId(null);

    if (!res.success) {
      showToast(res.error || 'Failed to delete transaction');
    } else {
      showToast('Transaction deleted');
      loadData();
    }
  };

  const formatCurrency = (val: number) => {
    return `₹${Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getFilterLabel = (f: DateFilterType) => {
    switch (f) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'this_week':
        return 'This Week';
      case 'this_month':
        return 'This Month';
      case 'custom':
        return 'Custom Range';
      case 'all':
      default:
        return 'All Time';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Primary Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ztext tracking-tight flex items-center gap-2">
            <Wallet className="text-zred" size={26} />
            Expense &amp; Balance Tracker
          </h1>
          <p className="text-xs text-ztext-light mt-1">
            Track business &amp; personal cash flow, maintain starting balances, and view real-time running metrics.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="button-z button-z-primary text-sm px-5 py-2.5 shadow-md flex items-center justify-center gap-2 shrink-0 font-bold"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance Card */}
        <div className="bg-zcard rounded-2xl border border-zborder p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ztext-muted">
                Available Balance
              </p>
              <div className="mt-2 text-3xl font-black text-ztext">
                {loading && !summary ? (
                  <div className="h-9 w-32 bg-zgray animate-pulse rounded-lg" />
                ) : (
                  formatCurrency(summary?.overallAvailableBalance ?? 0)
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-zred/10 text-zred">
              <Wallet size={22} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zborder flex items-center justify-between text-xs">
            <span className="text-ztext-light font-medium">
              Starting: {formatCurrency(summary?.startingBalance ?? 0)}
            </span>
            <button
              onClick={() => setIsStartingBalanceOpen(true)}
              className="text-zred font-bold hover:underline flex items-center gap-1"
            >
              <Pencil size={12} /> Edit Starting
            </button>
          </div>
        </div>

        {/* Total Income Card */}
        <div className="bg-zcard rounded-2xl border border-zborder p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                <ArrowDownLeft size={14} /> Total Income ({getFilterLabel(activeFilter)})
              </p>
              <div className="mt-2 text-2xl font-black text-emerald-500">
                {loading && !summary ? (
                  <div className="h-8 w-28 bg-zgray animate-pulse rounded-lg" />
                ) : (
                  `+ ${formatCurrency(summary?.periodIncome ?? 0)}`
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ArrowDownLeft size={22} />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-ztext-muted">
            All Time Income: + {formatCurrency(summary?.totalIncome ?? 0)}
          </p>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-zcard rounded-2xl border border-zborder p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-500 flex items-center gap-1">
                <ArrowUpRight size={14} /> Total Expenses ({getFilterLabel(activeFilter)})
              </p>
              <div className="mt-2 text-2xl font-black text-red-500">
                {loading && !summary ? (
                  <div className="h-8 w-28 bg-zgray animate-pulse rounded-lg" />
                ) : (
                  `- ${formatCurrency(summary?.periodExpenses ?? 0)}`
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
              <ArrowUpRight size={22} />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-ztext-muted">
            All Time Expenses: - {formatCurrency(summary?.totalExpenses ?? 0)}
          </p>
        </div>
      </div>

      {/* Date Filter & Control Bar */}
      <div className="bg-zcard rounded-2xl border border-zborder p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ztext">
            <Filter size={16} className="text-zred" />
            <span>Filter Transactions:</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-1.5 rounded-lg text-ztext-muted hover:bg-zgray hover:text-ztext transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'today', 'yesterday', 'this_week', 'this_month', 'custom'] as DateFilterType[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === f
                    ? 'bg-zred text-white shadow-sm'
                    : 'bg-zgray text-ztext-light hover:bg-zborder hover:text-ztext'
                }`}
              >
                {getFilterLabel(f)}
              </button>
            )
          )}
        </div>

        {/* Custom Date Range Inputs */}
        {activeFilter === 'custom' && (
          <div className="pt-2 border-t border-zborder grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md animate-in fade-in duration-150">
            <div>
              <label className="block text-[11px] font-semibold text-ztext-muted mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input-z text-xs w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ztext-muted mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input-z text-xs w-full"
              />
            </div>
          </div>
        )}

        {/* Filter Context Label */}
        <div className="pt-2 text-[11px] text-ztext-muted flex items-center justify-between">
          <span>
            Showing transactions for: <strong className="text-ztext">{getFilterLabel(activeFilter)}</strong>
          </span>
          <span className="text-xs font-semibold text-ztext">
            Period Net: {' '}
            <span
              className={
                (summary?.periodNet ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
              }
            >
              {(summary?.periodNet ?? 0) >= 0 ? '+' : '-'} {formatCurrency(summary?.periodNet ?? 0)}
            </span>
          </span>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-zcard rounded-2xl border border-zborder shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zborder flex items-center justify-between">
          <h2 className="text-sm font-bold text-ztext flex items-center gap-2">
            <Calendar size={16} className="text-zred" />
            Transaction History
          </h2>
          <span className="text-xs font-semibold text-ztext-muted">
            {summary?.transactions.length || 0} transaction{(summary?.transactions.length || 0) === 1 ? '' : 's'}
          </span>
        </div>

        {error && (
          <div className="p-6 text-center">
            <p className="text-xs font-semibold text-red-500">{error}</p>
            <button onClick={loadData} className="mt-2 button-z button-z-ghost text-xs">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 size={24} className="animate-spin text-zred" />
            <p className="text-xs text-ztext-muted font-medium">Loading transaction records...</p>
          </div>
        ) : summary?.transactions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-zgray flex items-center justify-center text-ztext-muted mb-1">
              <SlidersHorizontal size={20} />
            </div>
            <p className="text-sm font-bold text-ztext">No transactions found</p>
            <p className="text-xs text-ztext-muted max-w-sm">
              No income or expense records found for the selected period. Click below to add your first transaction.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-3 button-z button-z-primary text-xs px-4 py-2 font-bold inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Transaction
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zborder overflow-x-auto">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-zgray/50 text-[11px] font-bold text-ztext-muted uppercase tracking-wider">
              <div className="col-span-2">Date</div>
              <div className="col-span-4">Description / Where spent</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2 text-right">Running Balance</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>

            {/* Transaction Rows */}
            {summary?.transactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isDeleting = deletingId === tx.id;

              return (
                <div
                  key={tx.id}
                  className="p-4 md:px-4 md:py-3 hover:bg-zgray/40 transition-colors grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-center"
                >
                  {/* Mobile Row Header */}
                  <div className="flex md:contents items-center justify-between">
                    <div className="col-span-2 text-xs font-semibold text-ztext-light">
                      {formatDateLabel(tx.transaction_date)}
                    </div>
                    <div className="md:hidden">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 uppercase ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {tx.type}
                      </span>
                    </div>
                  </div>

                  {/* Description & Note */}
                  <div className="col-span-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`hidden md:inline-flex w-2 h-2 rounded-full shrink-0 ${
                          isIncome ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <p className="text-sm font-bold text-ztext truncate">
                        {tx.description}
                      </p>
                    </div>
                    {tx.note && (
                      <p className="text-xs text-ztext-muted mt-0.5 truncate pl-4 md:pl-4">
                        {tx.note}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="col-span-2 md:text-right flex md:block items-center justify-between">
                    <span className="md:hidden text-xs text-ztext-muted">Amount:</span>
                    <span
                      className={`text-sm font-extrabold ${
                        isIncome ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {isIncome ? '+ ' : '- '}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>

                  {/* Running Balance */}
                  <div className="col-span-2 md:text-right flex md:block items-center justify-between border-t md:border-t-0 pt-2 md:pt-0 border-zborder/50">
                    <span className="md:hidden text-xs text-ztext-muted">Running Balance:</span>
                    <span className="text-xs font-bold text-ztext">
                      {formatCurrency(tx.running_balance)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end md:justify-center gap-1 pt-2 md:pt-0">
                    <button
                      onClick={() => handleOpenEdit(tx)}
                      disabled={isDeleting}
                      title="Edit Transaction"
                      className="p-1.5 rounded-lg text-ztext-muted hover:bg-zgray hover:text-ztext transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      disabled={isDeleting}
                      title="Delete Transaction"
                      className="p-1.5 rounded-lg text-ztext-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    >
                      {isDeleting ? (
                        <Loader2 size={15} className="animate-spin text-red-500" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Starting Balance Modal */}
      <StartingBalanceModal
        isOpen={isStartingBalanceOpen}
        onClose={() => setIsStartingBalanceOpen(false)}
        currentBalance={summary?.startingBalance ?? 0}
        onSuccess={loadData}
      />

      {/* Add / Edit Expense Modal */}
      <AddEditExpenseModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        onSuccess={loadData}
      />
    </div>
  );
}
