'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Download, Search, Banknote, ShieldCheck, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '@/components/ui/data-table';
import DateFilter, { type DateFilterValue } from '@/components/ui/date-filter';
import { getOwnerPayments } from '@/features/owner/actions';
import type { PaymentAdmin } from '@/features/admin/types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  processing: 'bg-amber-500/10 text-amber-400',
  confirmed: 'bg-emerald-500/10 text-emerald-400',
  collected: 'bg-emerald-500/10 text-emerald-400',
  failed: 'bg-red-500/10 text-red-400',
  refunded: 'bg-blue-500/10 text-blue-400',
  partially_refunded: 'bg-indigo-500/10 text-indigo-400',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  confirmed: 'Success',
  collected: 'Collected',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Part Refund',
};

function formatCurrency(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function paymentTitle(method: string): string {
  if (method === 'cod' || method === 'collected') return 'Cash on Delivery';
  if (method === 'bnpl') return 'BNPL / Credit';
  if (method === 'upi') return 'UPI Payment';
  return 'Online Payment';
}

export default function OwnerPaymentsPage() {
  const [payments, setPayments] = useState<PaymentAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateFilterValue>({});
  const [showTransactions, setShowTransactions] = useState<boolean>(false);
  const sortBy = 'created_at';
  const sortOrder: 'asc' | 'desc' = 'desc';

  const fetchPayments = useCallback(async (p?: number) => {
    setLoading(true);
    const res = await getOwnerPayments({
      search: search || undefined,
      status: status !== 'all' ? status : undefined,
      ...dateRange,
      page: p ?? page,
      pageSize: 50,
      sortBy,
      sortOrder,
    });
    if (res.success && res.data) {
      setPayments(res.data.data as PaymentAdmin[]);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    }
    setLoading(false);
  }, [search, status, dateRange, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchPayments(1);  
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filterKey = useMemo(
    () => JSON.stringify([search, status, dateRange, sortBy, sortOrder]),
    [search, status, dateRange, sortBy, sortOrder],
  );
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (filterKey === lastFilterKey.current) return;
    lastFilterKey.current = filterKey;
    fetchPayments(1);
  }, [filterKey, fetchPayments]);

  const stats = useMemo(() => {
    const completed = payments.filter((p) => ['confirmed', 'collected'].includes(p.status));
    const totalAmount = completed.reduce((sum, p) => sum + Number(p.amount), 0);
    const avg = completed.length > 0 ? totalAmount / completed.length : 0;
    return { count: completed.length, totalAmount, avg };
  }, [payments]);

  const handleExport = () => {
    const csv = [
      ['ID', 'Order', 'Amount', 'Method', 'Gateway', 'Gateway ID', 'Status', 'Refunded', 'Date'].join(','),
      ...payments.map((p) => [p.id, p.order?.tracking_code ?? '', p.amount, p.payment_method, p.gateway, p.gateway_payment_id ?? '', p.status, p.refund_amount ?? 0, p.created_at].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Payments & Billing" description={`${total} transaction${total !== 1 ? 's' : ''}`}>
        <button
          onClick={() => setShowTransactions((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-zcard text-ztext border border-zborder rounded-xl hover:bg-zgray transition-colors"
        >
          {showTransactions ? (
            <>
              <EyeOff size={14} className="text-ztext-muted" />
              <span>Hide</span>
            </>
          ) : (
            <>
              <Eye size={14} className="text-zred" />
              <span>Show</span>
            </>
          )}
        </button>
        <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-zcard border border-zborder rounded-xl hover:bg-zgray transition-colors">
          <Download size={14} /> Export CSV
        </button>
        <button onClick={() => fetchPayments()} aria-label="Refresh payments" className="p-2.5 rounded-xl hover:bg-zgray text-ztext-lighter transition-colors">
          <RefreshCw size={18} />
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-zcard border border-zborder p-4">
          <p className="text-[11px] text-ztext-lighter font-medium">Total Collected</p>
          <p className="text-lg font-bold text-ztext mt-1">{formatCurrency(stats.totalAmount)}</p>
          <p className="text-[10px] text-emerald-500/80 font-semibold mt-1.5 flex items-center gap-0.5">
            <ShieldCheck size={11} /> {stats.count} paid order{stats.count !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="bg-zcard border border-zborder p-4">
          <p className="text-[11px] text-ztext-lighter font-medium">Avg. Order Value</p>
          <p className="text-lg font-bold text-ztext mt-1">{formatCurrency(stats.avg)}</p>
          <p className="text-[10px] text-ztext-muted font-semibold mt-1.5">{stats.count} total order{stats.count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {!showTransactions ? (
        <div className="text-center py-12 bg-zcard border border-zborder rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-zgray flex items-center justify-center mx-auto mb-3 text-ztext-muted">
            <Eye size={22} className="text-zred" />
          </div>
          <p className="text-sm font-semibold text-ztext">Payment records are hidden</p>
          <p className="text-xs text-ztext-lighter mt-1">Click the Show button above to view all payments and filters.</p>
          <button
            onClick={() => setShowTransactions(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-zred/10 text-zred border border-zred/20 rounded-xl text-xs font-bold hover:bg-zred hover:text-white transition-all"
          >
            <Eye size={14} /> Show Payments
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ztext-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by gateway ID or order..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-zborder rounded-xl bg-zcard focus:outline-none focus:ring-2 focus:ring-zred/20 focus:border-zred placeholder-ztext-muted transition-all"
            />
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[
              { value: 'all', label: `All (${total})` },
              { value: 'confirmed', label: 'Success' },
              { value: 'pending', label: 'Pending' },
              { value: 'refunded', label: 'Refunds' },
              { value: 'failed', label: 'Failed' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatus(opt.value); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                  status === opt.value
                    ? 'bg-ztext text-zbg border-ztext'
                    : 'bg-zcard border-zborder text-ztext-muted hover:border-ztext-light hover:text-ztext'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <DateFilter onChange={(v) => { setDateRange(v); setPage(1); }} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 bg-zcard border border-zborder">
              <Loader2 className="w-6 h-6 animate-spin text-ztext-muted" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 bg-zcard border border-zborder">
              <div className="w-12 h-12 rounded-xl bg-zgray flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} className="text-ztext-muted" />
              </div>
              <p className="text-sm font-semibold text-ztext">No payments found</p>
              <p className="text-xs text-ztext-lighter mt-1">Payments will appear here once orders are confirmed.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {payments.map((p) => {
                const m = p.payment_method;
                return (
                  <div key={p.id} className="bg-zcard border border-zborder rounded-2xl px-4 py-3 flex items-center justify-between gap-3 hover:border-ztext/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zgray border border-zborder flex items-center justify-center shrink-0">
                        <Banknote size={18} className="text-ztext-light" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ztext truncate">{paymentTitle(m)}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ztext-muted">
                          <span>{formatDate(p.created_at)}</span>
                          <span className="font-mono text-[10px] bg-zgray px-1.5 py-0.5 rounded border border-zborder">
                            {p.order?.tracking_code ?? p.id.slice(0, 6)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-ztext">{formatCurrency(p.amount)}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[p.status] ?? 'bg-zgray text-ztext-light'}`}>
                        {STATUS_LABEL[p.status] ?? p.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-zcard border border-zborder rounded-2xl">
                  <p className="text-xs text-ztext-lighter">
                    Showing {(page - 1) * 50 + 1}-{Math.min(page * 50, total)} of {total}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => fetchPayments(page - 1)} disabled={page <= 1} aria-label="Previous page" className="px-3 py-1.5 rounded-lg text-sm hover:bg-zgray disabled:opacity-30 transition-colors">Previous</button>
                    <button onClick={() => fetchPayments(page + 1)} disabled={page >= totalPages} aria-label="Next page" className="px-3 py-1.5 rounded-lg text-sm hover:bg-zgray disabled:opacity-30 transition-colors">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}