'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Eye, X, Lock } from 'lucide-react';
import { DataTable, SearchInput, StatusFilter, PageHeader } from '@/components/ui/data-table';
import DateFilter, { type DateFilterValue } from '@/components/ui/date-filter';
import { getOwnerOrders } from '@/features/owner/actions';
import type { AdminOrder } from '@/features/admin/types';
import { orderTypeLabel } from '@/features/orders/types';
import { usePolling } from '@/hooks/usePolling';

const ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'assigned', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];

const POLL_INTERVAL_MS = 30_000;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  accepted: 'bg-blue-500/10 text-blue-400',
  preparing: 'bg-indigo-500/10 text-indigo-400',
  ready: 'bg-green-500/10 text-green-400',
  assigned: 'bg-purple-500/10 text-purple-400',
  out_for_delivery: 'bg-orange-500/10 text-orange-400',
  delivered: 'bg-emerald-500/10 text-emerald-400',
  completed: 'bg-emerald-500/10 text-emerald-400',
  cancelled: 'bg-red-500/10 text-red-400',
};

export default function OwnerOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateFilterValue>({});
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  const fetchOrders = useCallback(async (p?: number, silent = false) => {
    if (!silent) setLoading(true);
    const res = await getOwnerOrders({
      search: search || undefined,
      status: status !== 'all' ? status : undefined,
      ...dateRange,
      page: p ?? page,
      pageSize: 50,
      sortBy,
      sortOrder,
    });
    if (res.success && res.data) {
      setOrders(res.data.data as AdminOrder[]);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    }
    if (!silent) setLoading(false);
  }, [search, status, dateRange, sortBy, sortOrder, page]);

  usePolling(() => { fetchOrders(undefined, true); }, POLL_INTERVAL_MS);

  useEffect(() => {
    fetchOrders(1); // eslint-disable-line react-hooks/set-state-in-effect
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filterKey = useMemo(
    () => JSON.stringify([search, status, dateRange, sortBy, sortOrder]),
    [search, status, dateRange, sortBy, sortOrder],
  );
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (filterKey === lastFilterKey.current) return;
    lastFilterKey.current = filterKey;
    fetchOrders(1);
  }, [filterKey, fetchOrders]);

  const columns = [
    { key: 'tracking', header: 'Tracking', render: (o: AdminOrder) => (
      <span className="font-mono text-xs font-medium text-ztext">{o.tracking_code}</span>
    )},
    { key: 'customer', header: 'Customer', render: (o: AdminOrder) => (
      <div>
        <p className="text-sm font-medium text-ztext-light">{o.user?.full_name ?? o.customer_name ?? 'Guest'}</p>
        <p className="text-xs text-ztext-lighter">{o.user?.email ?? o.customer_email ?? ''}</p>
      </div>
    )},
    { key: 'restaurant', header: 'Restaurant', render: (o: AdminOrder) => (
      <span className="text-sm text-ztext-light">{o.restaurant?.name ?? 'Unknown'}</span>
    ), hideOnMobile: true},
    { key: 'total', header: 'Total', sortable: true, render: (o: AdminOrder) => (
      <span className="font-medium text-ztext">₹{Number(o.total).toLocaleString('en-IN')}</span>
    )},
    { key: 'orderType', header: 'Order Type', render: (o: AdminOrder) => (
      <span className="text-xs text-ztext-light">{o.order_type ? orderTypeLabel(o.order_type) : '-'}</span>
    ), hideOnMobile: true},
    { key: 'payment', header: 'Payment', render: (o: AdminOrder) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-ztext-lighter capitalize">{o.payment_method ?? 'N/A'}</span>
        <span className={`text-[10px] font-medium ${o.payment_status === 'confirmed' ? 'text-emerald-600' : o.payment_status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
          {o.payment_status}
        </span>
      </div>
    ), hideOnMobile: true},
    { key: 'status', header: 'Status', render: (o: AdminOrder) => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? 'bg-zgray text-ztext-light'}`}>
        {o.status.replace(/_/g, ' ')}
      </span>
    )},
    { key: 'deliveredBy', header: 'Delivered by', render: (o: AdminOrder) => (
      o.delivery_partner && (o.status === 'delivered' || o.status === 'completed') ? (
        <div>
          <p className="text-sm font-medium text-ztext-light">{o.delivery_partner.full_name ?? 'Delivery partner'}</p>
          {o.delivery_partner.phone && <p className="text-xs text-ztext-lighter">{o.delivery_partner.phone}</p>}
        </div>
      ) : (
        <span className="text-xs text-ztext-lighter">—</span>
      )
    ), hideOnMobile: true},
    { key: 'date', header: 'Date', sortable: true, render: (o: AdminOrder) => (
      <span className="text-xs text-ztext-lighter">{new Date(o.created_at).toLocaleString()}</span>
    ), hideOnMobile: true},
    { key: 'actions', header: 'Details', render: (o: AdminOrder) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedOrder(o);
        }}
        className="p-1.5 rounded-lg hover:bg-zgray text-ztext-lighter hover:text-ztext transition-colors"
        title="View Details"
      >
        <Eye size={15} />
      </button>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Orders" description={`${total} total order${total !== 1 ? 's' : ''} (Read-only)`} />
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ztext-muted bg-zcard rounded-xl border border-zborder">
          <Lock size={13} />
          Read-only
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by tracking code, customer..." />
        </div>
        <StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[
          { label: 'All status', value: 'all' },
          ...ORDER_STATUSES.map((s) => ({ label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value: s })),
        ]} />
        <button onClick={() => fetchOrders()} aria-label="Refresh orders" className="p-2.5 rounded-xl hover:bg-zgray text-ztext-lighter transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="mb-4">
        <DateFilter onChange={(v) => { setDateRange(v); setPage(1); }} />
      </div>

      <div className="bg-zcard rounded-xl border border-zborder">
        <DataTable
          columns={columns}
          data={orders as unknown as Record<string, unknown>[]}
          total={total}
          page={page}
          pageSize={50}
          totalPages={totalPages}
          loading={loading}
          onPageChange={(p) => fetchOrders(p)}
          onSort={(key, order) => { setSortBy(key); setSortOrder(order); }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          keyExtractor={(o) => (o as unknown as AdminOrder).id}
          emptyMessage="No orders found"
        />
      </div>

      {/* Read-Only Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-zcard rounded-2xl max-w-md w-full border border-zborder shadow-z-modal p-6 space-y-4 max-h-[90vh] overflow-y-auto"
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
              <div className="flex justify-between py-1 border-b border-zborder/40">
                <span className="text-ztext-lighter">Customer:</span>
                <span className="font-semibold text-ztext">
                  {selectedOrder.user?.full_name ?? selectedOrder.customer_name ?? 'Guest'}
                </span>
              </div>
              {selectedOrder.customer_phone && (
                <div className="flex justify-between py-1 border-b border-zborder/40">
                  <span className="text-ztext-lighter">Phone:</span>
                  <span className="font-semibold text-ztext">
                    {selectedOrder.customer_phone}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-zborder/40">
                <span className="text-ztext-lighter">Order Type:</span>
                <span className="font-semibold text-ztext capitalize">
                  {selectedOrder.order_type ? orderTypeLabel(selectedOrder.order_type) : 'Delivery'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zborder/40">
                <span className="text-ztext-lighter">Payment:</span>
                <span className="font-semibold text-ztext capitalize">
                  {selectedOrder.payment_method} ({selectedOrder.payment_status})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zborder/40">
                <span className="text-ztext-lighter">Status:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[selectedOrder.status] ?? 'bg-zgray text-ztext-light'}`}>
                  {selectedOrder.status.replace(/_/g, ' ')}
                </span>
              </div>
              {Boolean((selectedOrder.delivery_address as { address?: string } | null)?.address) && (
                <div className="py-1 border-b border-zborder/40">
                  <span className="text-ztext-lighter block mb-0.5">Delivery Address:</span>
                  <span className="font-medium text-ztext leading-relaxed">
                    {(selectedOrder.delivery_address as { address?: string })?.address}
                  </span>
                </div>
              )}
            </div>

            {/* Line items */}
            {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-ztext mb-2 uppercase tracking-wider">Ordered Items</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs py-1 border-b border-zborder/30">
                      <span className="text-ztext">{item.quantity} × {item.product_name}</span>
                      <span className="font-semibold text-ztext">₹{item.subtotal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-zborder flex justify-between items-center text-sm font-bold text-ztext">
              <span>Total Amount</span>
              <span className="text-base text-emerald-500">₹{Number(selectedOrder.total).toLocaleString('en-IN')}</span>
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
