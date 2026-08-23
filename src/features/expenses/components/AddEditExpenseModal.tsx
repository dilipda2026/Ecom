'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, IndianRupee, PlusCircle, Pencil } from 'lucide-react';
import { addExpenseTransaction, updateExpenseTransaction } from '../actions';
import { showToast } from '@/components/shared/Toast';
import type { ExpenseTransaction, ExpenseType } from '../types';

interface AddEditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: ExpenseTransaction | null;
  onSuccess: () => void;
}

const COMMON_SUGGESTIONS = ['Food', 'Travel', 'Shopping', 'College', 'Utilities', 'Freelance Payment', 'Rent', 'Supplies'];

export default function AddEditExpenseModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: AddEditExpenseModalProps) {
  const isEditing = Boolean(transaction);

  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState<string>(getTodayISO());
  const [type, setType] = useState<ExpenseType>('expense');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- reset form when modal opens or edited row changes */
  useEffect(() => {
    if (transaction) {
      setDate(transaction.transaction_date);
      setType(transaction.type);
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
      setNote(transaction.note || '');
    } else {
      setDate(getTodayISO());
      setType('expense');
      setDescription('');
      setAmount('');
      setNote('');
    }
    setError(null);
  }, [transaction, isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    setSubmitting(true);

    if (isEditing && transaction) {
      const res = await updateExpenseTransaction(transaction.id, {
        transaction_date: date,
        type,
        description: description.trim(),
        amount: numericAmount,
        note: note.trim() || null,
      });

      setSubmitting(false);

      if (!res.success) {
        setError(res.error || 'Failed to update transaction');
      } else {
        showToast('Transaction updated');
        onSuccess();
        onClose();
      }
    } else {
      const res = await addExpenseTransaction({
        transaction_date: date,
        type,
        description: description.trim(),
        amount: numericAmount,
        note: note.trim() || null,
      });

      setSubmitting(false);

      if (!res.success) {
        setError(res.error || 'Failed to add transaction');
      } else {
        showToast('Transaction added');
        onSuccess();
        onClose();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-zborder bg-zcard p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zborder pb-3">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Pencil size={20} className="text-zred" />
            ) : (
              <PlusCircle size={20} className="text-zred" />
            )}
            <h2 className="text-lg font-bold text-ztext">
              {isEditing ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-ztext-muted hover:bg-zgray transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          {/* Transaction Type Selector (Expense vs Income) */}
          <div>
            <label className="block text-xs font-semibold text-ztext-light mb-1.5">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2.5 px-4 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-1.5 ${
                  type === 'expense'
                    ? 'bg-red-500/15 border-red-500 text-red-500 shadow-sm'
                    : 'bg-zgray/50 border-zborder text-ztext-muted hover:border-ztext-muted'
                }`}
              >
                <span className="text-lg leading-none">-</span> Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2.5 px-4 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-1.5 ${
                  type === 'income'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500 shadow-sm'
                    : 'bg-zgray/50 border-zborder text-ztext-muted hover:border-ztext-muted'
                }`}
              >
                <span className="text-lg leading-none">+</span> Income
              </button>
            </div>
          </div>

          {/* Amount & Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ztext-light mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-ztext-muted">
                  <IndianRupee size={15} />
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150"
                  className="input-z pl-9 w-full text-sm font-semibold"
                  disabled={submitting}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ztext-light mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-z w-full text-sm font-medium"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-ztext-light mb-1">
              Description / Where spent *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Food, Travel, Shopping, College"
              className="input-z w-full text-sm"
              disabled={submitting}
            />

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setDescription(sug)}
                  className="text-[11px] font-medium px-2 py-1 rounded-md bg-zgray text-ztext-light hover:bg-zborder transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-semibold text-ztext-light mb-1">
              Optional Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional details, invoice reference, etc."
              rows={2}
              className="input-z w-full text-sm resize-none"
              disabled={submitting}
            />
          </div>

          {/* Form buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zborder">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="button-z button-z-ghost text-sm px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="button-z button-z-primary text-sm px-5 inline-flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                'Update Transaction'
              ) : (
                'Add Transaction'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
