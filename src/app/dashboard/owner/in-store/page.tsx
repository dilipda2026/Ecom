'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Store, Search, Banknote, RefreshCw, Calendar, TrendingUp,
  FileText, X, Check, Lock, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';
import { getOwnerInStoreOrdersAndStats } from '@/features/owner/actions';

interface InStoreOrderRecord {
  id: string;
  tracking_code: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  order_type: string | null;
  delivery_address: { address?: string } | null;
  delivery_notes: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string | null;
  payment_status: string;
  status: string;
  created_at: string;
  order_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price?: number;
    subtotal: number;
  }>;
}

interface HistoryStats {
  totalOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  cashRevenue: number;
  onlineRevenue: number;
}

export default function OwnerInStorePage() {
  const [orders, setOrders] = useState<InStoreOrderRecord[]>([]);
  const [stats, setStats] = useState<HistoryStats>({
    totalOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    cashRevenue: 0,
    onlineRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [orderType, setOrderType] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Order for Receipt Modal
  const [selectedOrder, setSelectedOrder] = useState<InStoreOrderRecord | null>(null);

  const fetchHistory = useCallback(async (p = 1) => {
    setLoading(true);
    const res = await getOwnerInStoreOrdersAndStats({
      search: search.trim() || undefined,
      paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
      orderType: orderType !== 'all' ? orderType : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate ? `${toDate}T23:59:59.999Z` : undefined,
      page: p,
      pageSize: 20,
    });

    if (res.success && res.data) {
      setStats(res.data.stats);
      setOrders(res.data.orders as InStoreOrderRecord[]);
      setTotal(res.data.total);
      setPage(res.data.page);
      setTotalPages(res.data.totalPages || 1);
    }
    setLoading(false);
  }, [search, paymentMethod, orderType, fromDate, toDate]);

  const filterKey = useMemo(
    () => JSON.stringify([search, paymentMethod, orderType, fromDate, toDate]),
    [search, paymentMethod, orderType, fromDate, toDate]
  );
  const lastFilterKey = useRef(filterKey);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterKey !== lastFilterKey.current) {
        lastFilterKey.current = filterKey;
        setPage(1);
        fetchHistory(1);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [filterKey, fetchHistory]);

  useEffect(() => {
    fetchHistory(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ztext flex items-center gap-2.5">
            <Store className="text-zred" size={24} />
            In-Store Counter History
          </h1>
          <p className="text-xs sm:text-sm text-ztext-light mt-0.5">
            Read-only history and revenue analytics for in-store and takeaway counter orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ztext-muted bg-zcard rounded-xl border border-zborder">
            <Lock size={13} />
            Read-only
          </span>
          <button
            onClick={() => fetchHistory(page)}
            className="p-2.5 rounded-xl hover:bg-zgray text-ztext-light border border-zborder transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-zcard p-4 rounded-2xl border border-zborder shadow-sm">
          <span className="text-[11px] font-semibold text-ztext-muted uppercase tracking-wider">Total Orders</span>
          <div className="text-xl sm:text-2xl font-black text-ztext mt-1">{stats.totalOrders}</div>
        </div>
        <div className="bg-zcard p-4 rounded-2xl border border-zborder shadow-sm">
          <span className="text-[11px] font-semibold text-ztext-muted uppercase tracking-wider">Total Revenue</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-500 mt-1">₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-zcard p-4 rounded-2xl border border-zborder shadow-sm">
          <span className="text-[11px] font-semibold text-ztext-muted uppercase tracking-wider">Today's Revenue</span>
          <div className="text-xl sm:text-2xl font-black text-zred mt-1">₹{stats.todayRevenue.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-zcard p-4 rounded-2xl border border-zborder shadow-sm">
          <span className="text-[11px] font-semibold text-ztext-muted uppercase tracking-wider">Cash Counter</span>
          <div className="text-xl sm:text-2xl font-black text-amber-500 mt-1">₹{stats.cashRevenue.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-zcard p-4 rounded-2xl border border-zborder shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-ztext-muted uppercase tracking-wider">UPI / Online</span>
          <div className="text-xl sm:text-2xl font-black text-blue-500 mt-1">₹{stats.onlineRevenue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-zcard p-4 rounded-2xl border border-zborder shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ztext-lighter" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracking code, phone, customer..."
              className="input-z w-full pl-9 text-xs h-10"
            />
          </div>

          <div>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input-z w-full text-xs h-10"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="razorpay">Razorpay / Card</option>
            </select>
          </div>

          <div>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="input-z w-full text-xs h-10"
            >
              <option value="all">All Order Types</option>
              <option value="in_store">In-Store (Dine-in/Counter)</option>
              <option value="takeaway">Take Away</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input-z text-xs h-10 w-full"
              title="From date"
            />
            <span className="text-xs text-ztext-lighter">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input-z text-xs h-10 w-full"
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-zcard rounded-2xl border border-zborder shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zgray border-b border-zborder font-semibold text-ztext-muted uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Tracking #</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Total</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zborder">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ztext-lighter">
                    Loading in-store orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-ztext-lighter">
                    No in-store orders found matching filters.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className="hover:bg-zgray/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-ztext">{o.tracking_code}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        o.order_type === 'takeaway'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {o.order_type === 'takeaway' ? '🥡 Takeaway' : '🏪 Counter'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-ztext">{o.customer_name || 'Counter Guest'}</div>
                      {o.customer_phone && <div className="text-ztext-lighter text-[11px]">{o.customer_phone}</div>}
                    </td>
                    <td className="p-3.5 text-ztext-light max-w-[200px] truncate">
                      {o.order_items?.map((i) => `${i.product_name} ×${i.quantity}`).join(', ') || '—'}
                    </td>
                    <td className="p-3.5">
                      <span className="capitalize font-semibold text-ztext-light">{o.payment_method || 'Cash'}</span>
                      <span className={`block text-[10px] ${o.payment_status === 'confirmed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-ztext">₹{o.total}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        o.status === 'delivered' || o.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-ztext-lighter whitespace-nowrap">
                      {new Date(o.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(o);
                        }}
                        className="p-1.5 rounded-lg hover:bg-zgray text-ztext-lighter hover:text-ztext transition-colors"
                        title="View Receipt"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zborder flex items-center justify-between">
            <span className="text-xs text-ztext-lighter">
              Showing page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchHistory(page - 1)}
                disabled={page <= 1 || loading}
                className="p-2 rounded-xl border border-zborder text-ztext hover:bg-zgray disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => fetchHistory(page + 1)}
                disabled={page >= totalPages || loading}
                className="p-2 rounded-xl border border-zborder text-ztext hover:bg-zgray disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Receipt Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-zcard rounded-2xl max-w-md w-full border border-zborder shadow-z-modal p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zborder pb-3">
              <div>
                <h3 className="text-base font-bold text-ztext">Order #{selectedOrder.tracking_code}</h3>
                <p className="text-xs text-ztext-lighter">
                  {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-ztext-lighter hover:text-ztext hover:bg-zgray transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zborder/50">
                <span className="text-ztext-lighter">Customer:</span>
                <span className="font-semibold text-ztext">{selectedOrder.customer_name || 'Counter Guest'}</span>
              </div>
              {selectedOrder.customer_phone && (
                <div className="flex justify-between py-1 border-b border-zborder/50">
                  <span className="text-ztext-lighter">Phone:</span>
                  <span className="font-semibold text-ztext">{selectedOrder.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-zborder/50">
                <span className="text-ztext-lighter">Order Type:</span>
                <span className="font-semibold text-ztext capitalize">{selectedOrder.order_type || 'In Store'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zborder/50">
                <span className="text-ztext-lighter">Payment Method:</span>
                <span className="font-semibold text-ztext capitalize">{selectedOrder.payment_method} ({selectedOrder.payment_status})</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-ztext mb-2 uppercase tracking-wider">Ordered Items</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedOrder.order_items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs py-1 border-b border-zborder/30">
                    <span className="text-ztext">{item.quantity} × {item.product_name}</span>
                    <span className="font-semibold text-ztext">₹{item.subtotal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zborder flex justify-between items-center text-sm font-bold text-ztext">
              <span>Total Amount</span>
              <span className="text-base text-emerald-500">₹{selectedOrder.total}</span>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="button-z button-z-secondary w-full text-xs font-semibold py-2.5"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
