import { describe, it, expect } from 'vitest';
import {
  expenseTransactionSchema,
  startingBalanceSchema,
} from '@/features/expenses/schemas';
import type { ExpenseType } from '@/features/expenses/types';

describe('Expense Tracker Schemas Validation', () => {
  describe('expenseTransactionSchema', () => {
    it('validates a correct income transaction', () => {
      const result = expenseTransactionSchema.safeParse({
        transaction_date: '2026-08-24',
        description: 'Freelance Payment',
        amount: 1000,
        type: 'income',
        note: 'Project milestone 1',
      });
      expect(result.success).toBe(true);
    });

    it('validates a correct expense transaction', () => {
      const result = expenseTransactionSchema.safeParse({
        transaction_date: '2026-08-24',
        description: 'Food',
        amount: 150,
        type: 'expense',
      });
      expect(result.success).toBe(true);
    });

    it('fails when amount is zero or negative', () => {
      const resultZero = expenseTransactionSchema.safeParse({
        transaction_date: '2026-08-24',
        description: 'Food',
        amount: 0,
        type: 'expense',
      });
      expect(resultZero.success).toBe(false);

      const resultNegative = expenseTransactionSchema.safeParse({
        transaction_date: '2026-08-24',
        description: 'Food',
        amount: -50,
        type: 'expense',
      });
      expect(resultNegative.success).toBe(false);
    });

    it('fails when date format is invalid', () => {
      const result = expenseTransactionSchema.safeParse({
        transaction_date: '24/08/2026',
        description: 'Food',
        amount: 100,
        type: 'expense',
      });
      expect(result.success).toBe(false);
    });

    it('fails when description is empty or whitespace', () => {
      const result = expenseTransactionSchema.safeParse({
        transaction_date: '2026-08-24',
        description: '   ',
        amount: 100,
        type: 'expense',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('startingBalanceSchema', () => {
    it('accepts zero starting balance', () => {
      const result = startingBalanceSchema.safeParse({ starting_balance: 0 });
      expect(result.success).toBe(true);
    });

    it('accepts positive starting balance', () => {
      const result = startingBalanceSchema.safeParse({ starting_balance: 5000 });
      expect(result.success).toBe(true);
    });

    it('rejects negative starting balance', () => {
      const result = startingBalanceSchema.safeParse({ starting_balance: -100 });
      expect(result.success).toBe(false);
    });
  });
});

describe('Balance & Running Balance Calculations', () => {
  it('calculates available balance correctly (Starting Balance + Income - Expenses)', () => {
    const startingBalance = 5000;
    const transactions: { amount: number; type: ExpenseType }[] = [
      { amount: 150, type: 'expense' },
      { amount: 50, type: 'expense' },
      { amount: 1000, type: 'income' },
    ];

    let running = startingBalance;
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const tx of transactions) {
      if (tx.type === 'income') {
        running += tx.amount;
        totalIncome += tx.amount;
      } else {
        running -= tx.amount;
        totalExpenses += tx.amount;
      }
    }

    expect(totalIncome).toBe(1000);
    expect(totalExpenses).toBe(200);
    expect(running).toBe(5800);
    expect(startingBalance + totalIncome - totalExpenses).toBe(5800);
  });

  it('calculates exact running balance for each transaction in sequence', () => {
    const startingBalance = 5000;
    const rawTx: { id: string; amount: number; type: ExpenseType; date: string }[] = [
      { id: '1', amount: 150, type: 'expense', date: '2026-08-24' },
      { id: '2', amount: 50, type: 'expense', date: '2026-08-24' },
      { id: '3', amount: 1000, type: 'income', date: '2026-08-24' },
      { id: '4', amount: 300, type: 'expense', date: '2026-08-25' },
    ];

    let running = startingBalance;
    const calculated = rawTx.map((tx) => {
      if (tx.type === 'income') {
        running += tx.amount;
      } else {
        running -= tx.amount;
      }
      return { ...tx, running_balance: running };
    });

    expect(calculated[0].running_balance).toBe(4850);
    expect(calculated[1].running_balance).toBe(4800);
    expect(calculated[2].running_balance).toBe(5800);
    expect(calculated[3].running_balance).toBe(5500);
  });

  it('filters transactions by date range correctly without mutating running balances', () => {
    const calculatedTx = [
      { id: '1', amount: 150, type: 'expense', date: '2026-08-20', running_balance: 4850 },
      { id: '2', amount: 50, type: 'expense', date: '2026-08-24', running_balance: 4800 },
      { id: '3', amount: 1000, type: 'income', date: '2026-08-24', running_balance: 5800 },
      { id: '4', amount: 300, type: 'expense', date: '2026-08-25', running_balance: 5500 },
    ];

    const startDate = '2026-08-24';
    const endDate = '2026-08-24';

    const filtered = calculatedTx.filter(
      (tx) => tx.date >= startDate && tx.date <= endDate
    );

    expect(filtered.length).toBe(2);
    expect(filtered[0].id).toBe('2');
    expect(filtered[1].id).toBe('3');

    // Period income and expense calculations
    const periodIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const periodExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const periodNet = periodIncome - periodExpense;

    expect(periodIncome).toBe(1000);
    expect(periodExpense).toBe(50);
    expect(periodNet).toBe(950);
  });
});
