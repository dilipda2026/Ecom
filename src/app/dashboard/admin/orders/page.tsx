'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Eye, XCircle, Clock, Bike, Loader2, QrCode } from 'lucide-react';
import { DataTable, SearchInput, StatusFilter, PageHeader, ConfirmDialog, ToastContainer, useToast } from '@/components/ui/data-table';
import { getAdminOrders, forceUpdateOrderStatus, cancelOrderByAdmin, getAdminOrderById, getAvailableDeliveryPartners, assignDeliveryPartner, regenerateOrderQr } from '@/features/admin/actions';
import type { AdminOrder } from '@/features/admin/types';
import { orderTypeLabel } from '@/features/orders/types';
import { usePolling } from '@/hooks/usePolling';
import QRCode from 'qrcode';

const ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'assigned', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];

const POLL_INTERVAL_MS = 30_000;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; newStatus?: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [forceStatus, setForceStatus] = useState('');
  const [forceReason, setForceReason] = useState('');
  const [assignTarget, setAssignTarget] = useState<AdminOrder | null>(null);
  const [partners, setPartners] = useState<Array<{ id: string; full_name: string | null; phone: string | null; vehicle_type: string; total_deliveries: number }>>([]);
  const [assigning, setAssigning] = useState(false);
  const [qrTarget, setQrTarget] = useState<AdminOrder | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0);
  const { toasts, addToast, removeToast } = useToast();

  const openAssign = async (o: AdminOrder) => {
    setAssignTarget(o);
    setAssigning(true);
    const res = await getAvailableDeliveryPartners();
    setAssigning(false);
    if (res.success && res.data) setPartners(res.data);
    else addToast(res.error ?? 'Failed to load partners', 'error');
  };

  const openQr = async (o: AdminOrder) => {
    setQrTarget(o);
    setQrLoading(true);
    const hasFreshToken = o.pickup_qr_token && o.pickup_qr_expires_at && new Date(o.pickup_qr_expires_at).getTime() > Date.now();
    if (hasFreshToken) {
      setQrToken(o.pickup_qr_token ?? null);
      setQrExpiresAt(o.pickup_qr_expires_at ?? '');
    } else {
      const res = await regenerateOrderQr(o.id);
      if (res.success && res.data) {
        setQrToken(res.data.token);
        setQrExpiresAt(res.data.expiresAt);
      } else {
        addToast(res.error ?? 'Failed to generate QR', 'error');
        setQrTarget(null);
      }
    }
    setQrLoading(false);
  };

  const handleRegenerateQr = async () => {
    if (!qrTarget) return;
    setQrLoading(true);
    const res = await regenerateOrderQr(qrTarget.id);
    setQrLoading(false);
    if (res.success && res.data) {
      setQrToken(res.data.token);
      setQrExpiresAt(res.data.expiresAt);
      addToast('New QR generated', 'success');
      fetchOrders();
    } else {
      addToast(res.error ?? 'Failed to regenerate', 'error');
    }
  };

  const handleAssign = async (partnerId: string) => {
    if (!assignTarget) return;
    setAssigning(true);
    const res = await assignDeliveryPartner(assignTarget.id, partnerId);
    setAssigning(false);
    if (res.success) { addToast('Delivery partner assigned', 'success'); setAssignTarget(null); fetchOrders(); }
    else addToast(res.error ?? 'Failed to assign', 'error');
  };

  const fetchOrders = useCallback(async (p?: number, silent = false) => {
    if (!silent) setLoading(true);
    const res = await getAdminOrders({
      search: search || undefined,
      status: status !== 'all' ? status : undefined,
      page: p ?? page,
      pageSize: 20,
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
  }, [search, status, sortBy, sortOrder, page]);

  usePolling(() => { fetchOrders(undefined, true); }, POLL_INTERVAL_MS);

  useEffect(() => {
    fetchOrders(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async (id: string, reason: string) => {
    const res = await cancelOrderByAdmin(id, reason);
    if (res.success) { addToast('Order cancelled', 'success'); fetchOrders(); }
    else addToast(res.error ?? 'Failed', 'error');
  };

  const handleForceUpdate = async () => {
    if (!confirmAction || !forceStatus) return;
    const res = await forceUpdateOrderStatus(confirmAction.id, forceStatus, forceReason || 'Admin override');
    if (res.success) { addToast('Order status updated', 'success'); setConfirmAction(null); setForceStatus(''); setForceReason(''); fetchOrders(); }
    else addToast(res.error ?? 'Failed', 'error');
  };

  const viewOrderDetails = async (id: string) => {
    const res = await getAdminOrderById(id);
    if (res.success && res.data) setSelectedOrder(res.data as AdminOrder);
  };

  useEffect(() => {
    if (!qrTarget) return;
    const tick = () => {
      const left = qrExpiresAt ? Math.max(0, Math.floor((new Date(qrExpiresAt).getTime() - Date.now()) / 1000)) : 0;
      setQrSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [qrTarget, qrExpiresAt]);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!qrToken) return;
    QRCode.toDataURL(qrToken, { width: 384, margin: 2 })
      .then((url) => { if (active) setQrDataUrl(url); })
      .catch(() => {});
    return () => { active = false; };
  }, [qrToken]);

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
    { key: 'status', header: 'Status', render: (o: AdminOrder) => {
      const colors: Record<string, string> = {
        pending: 'bg-amber-500/10 text-amber-400', accepted: 'bg-blue-500/10 text-blue-400',
        preparing: 'bg-indigo-500/10 text-indigo-400', ready: 'bg-green-500/10 text-green-400',
        assigned: 'bg-purple-500/10 text-purple-400', out_for_delivery: 'bg-orange-500/10 text-orange-400',
        delivered: 'bg-emerald-500/10 text-emerald-400', completed: 'bg-emerald-500/10 text-emerald-400',
        cancelled: 'bg-red-500/10 text-red-400',
      };
      return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[o.status] ?? 'bg-zgray text-ztext-light'}`}>{o.status.replace(/_/g, ' ')}</span>;
    }},
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
    { key: 'actions', header: 'Actions', render: (o: AdminOrder) => (
      <div className="flex items-center gap-1">
        <button onClick={() => viewOrderDetails(o.id)} className="p-1.5 hover:bg-zgray rounded-lg text-ztext-muted hover:text-ztext-light transition-colors" title="View details">
          <Eye size={14} />
        </button>
        {o.status !== 'cancelled' && o.status !== 'completed' && o.status !== 'delivered' && (
          <>
            <button onClick={() => openQr(o)} className="p-1.5 hover:bg-purple-500/10 rounded-lg text-ztext-muted hover:text-purple-600 transition-colors" title="Show pickup QR">
              <QrCode size={14} />
            </button>
            {o.status === 'ready' && (
              <button onClick={() => openAssign(o)} className="p-1.5 hover:bg-green-500/10 rounded-lg text-ztext-muted hover:text-green-600 transition-colors" title="Assign delivery partner">
                <Bike size={14} />
              </button>
            )}
            <button onClick={() => setConfirmAction({ type: 'force', id: o.id })} className="p-1.5 hover:bg-blue-500/10 rounded-lg text-ztext-muted hover:text-blue-600 transition-colors" title="Force update">
              <Clock size={14} />
            </button>
            <button onClick={() => setConfirmAction({ type: 'cancel', id: o.id })} className="p-1.5 hover:bg-red-500/10 rounded-lg text-ztext-muted hover:text-red-400 transition-colors" title="Cancel order">
              <XCircle size={14} />
            </button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Orders" description={`${total} total order${total !== 1 ? 's' : ''}`} />

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

      <div className="bg-zcard rounded-xl border border-zborder">
        <DataTable
          columns={columns}
          data={orders as unknown as Record<string, unknown>[]}
          total={total}
          page={page}
          pageSize={20}
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

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto" onClick={() => setSelectedOrder(null)}>
          <div className="bg-zcard rounded-2xl p-6 max-w-lg w-full shadow-z-modal my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-ztext">Order Details</h3>
              <button onClick={() => setSelectedOrder(null)} aria-label="Close details" className="p-1 hover:bg-zgray rounded-lg">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-ztext-lighter">Tracking</span><span className="font-mono font-medium">{selectedOrder.tracking_code}</span></div>
              {selectedOrder.order_type && <div className="flex justify-between"><span className="text-ztext-lighter">Order Type</span><span>{orderTypeLabel(selectedOrder.order_type)}</span></div>}
              <div className="flex justify-between"><span className="text-ztext-lighter">Customer</span><span>{selectedOrder.user?.full_name ?? selectedOrder.customer_name ?? 'Guest'}</span></div>
              <div className="flex justify-between"><span className="text-ztext-lighter">Restaurant</span><span>{selectedOrder.restaurant?.name ?? 'Unknown'}</span></div>
              <div className="flex justify-between"><span className="text-ztext-lighter">Total</span><span className="font-bold">₹{Number(selectedOrder.total).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-ztext-lighter">Payment</span><span className="capitalize">{selectedOrder.payment_method} ({selectedOrder.payment_status})</span></div>
              <div className="flex justify-between"><span className="text-ztext-lighter">Status</span><span>{selectedOrder.status.replace(/_/g, ' ')}</span></div>
              {selectedOrder.delivery_partner && (
                <div className="flex justify-between"><span className="text-ztext-lighter">Delivered by</span><span>{selectedOrder.delivery_partner.full_name ?? 'Delivery partner'}{selectedOrder.delivery_partner.phone ? ` • ${selectedOrder.delivery_partner.phone}` : ''}</span></div>
              )}
              {selectedOrder.cancellation_reason && (
                <div className="flex justify-between"><span className="text-ztext-lighter">Cancel reason</span><span className="text-red-400">{selectedOrder.cancellation_reason}</span></div>
              )}
              <div className="flex justify-between"><span className="text-ztext-lighter">Created</span><span>{new Date(selectedOrder.created_at).toLocaleString()}</span></div>
              {selectedOrder.delivery_address && (
                <div className="pt-3 border-t"><span className="text-ztext-lighter text-xs">Delivery Address</span>
                  <p className="text-ztext-light mt-1">{JSON.stringify(selectedOrder.delivery_address)}</p>
                </div>
              )}
              {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                <div className="pt-3 border-t">
                  <span className="text-ztext-lighter text-xs">Items</span>
                  <div className="mt-2 space-y-1">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span className="font-medium">₹{item.subtotal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pickup QR modal */}
      {qrTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setQrTarget(null)}>
          <div className="bg-zcard rounded-2xl p-6 max-w-sm w-full shadow-z-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ztext">Pickup QR</h3>
              <button onClick={() => setQrTarget(null)} aria-label="Close QR" className="p-1 hover:bg-zgray rounded-lg">&times;</button>
            </div>
            <p className="text-sm text-ztext-lighter mt-1">Order {qrTarget.tracking_code} • ₹{Number(qrTarget.total).toLocaleString('en-IN')}</p>
            <p className="text-xs text-ztext-light mt-0.5">Show this to any available delivery partner — scanning it claims the order.</p>
            <div className="mt-4 flex flex-col items-center">
              {qrLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-ztext-lighter" /></div>
              ) : qrDataUrl && qrToken ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt={`Pickup QR for ${qrTarget.tracking_code}`} className="w-56 h-56 rounded-xl border border-zborder bg-white p-2" />
                  <div className={`mt-3 text-xs font-medium ${qrSecondsLeft <= 60 ? 'text-red-400' : 'text-ztext-light'}`}>
                    {qrSecondsLeft > 0 ? `Expires in ${Math.floor(qrSecondsLeft / 60)}:${String(qrSecondsLeft % 60).padStart(2, '0')}` : 'Expired — regenerate a new QR'}
                  </div>
                  <button onClick={handleRegenerateQr} disabled={qrLoading}
                    className="mt-3 px-4 py-2 text-xs font-medium text-white bg-zred rounded-xl hover:bg-zred-dark transition-colors disabled:opacity-50">
                    Regenerate QR
                  </button>
                </>
              ) : (
                <p className="text-sm text-ztext-light py-12 text-center">Could not generate QR.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign delivery partner modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setAssignTarget(null)}>
          <div className="bg-zcard rounded-2xl p-6 max-w-sm w-full shadow-z-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-ztext">Assign delivery partner</h3>
            <p className="text-sm text-ztext-lighter mt-1">Order {assignTarget.tracking_code} • ₹{Number(assignTarget.total).toLocaleString('en-IN')}</p>
            <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
              {assigning ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-ztext-lighter" /></div>
              ) : partners.length === 0 ? (
                <p className="text-sm text-ztext-light py-4 text-center">No available delivery partners.</p>
              ) : (
                partners.map((p) => (
                  <button key={p.id} onClick={() => handleAssign(p.id)}
                    className="w-full text-left p-3 rounded-xl border border-zborder hover:border-zred hover:bg-red-500/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ztext">{p.full_name ?? 'Delivery partner'}</span>
                      <span className="text-xs text-ztext-lighter capitalize">{p.vehicle_type}</span>
                    </div>
                    <div className="text-xs text-ztext-lighter mt-0.5">
                      {p.phone ?? 'no phone'} • {p.total_deliveries} deliveries
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Force update modal */}
      {confirmAction?.type === 'force' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setConfirmAction(null)}>
          <div className="bg-zcard rounded-2xl p-6 max-w-sm w-full shadow-z-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-ztext">Force Update Status</h3>
            <p className="text-sm text-ztext-lighter mt-1">This will be audited.</p>
            <select value={forceStatus} onChange={(e) => setForceStatus(e.target.value)} className="w-full mt-4 px-3 py-2.5 text-sm border border-zborder rounded-xl focus:outline-none focus:ring-2 focus:ring-zred/20">
              <option value="">Select status...</option>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <input value={forceReason} onChange={(e) => setForceReason(e.target.value)} placeholder="Reason for change" className="w-full mt-3 px-3 py-2.5 text-sm border border-zborder rounded-xl focus:outline-none focus:ring-2 focus:ring-zred/20" />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmAction(null)} className="flex-1 px-4 py-2 text-sm font-medium text-ztext-light bg-zgray rounded-xl hover:bg-zsurface transition-colors">Cancel</button>
              <button onClick={handleForceUpdate} disabled={!forceStatus} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-zred rounded-xl hover:bg-zred-dark transition-colors disabled:opacity-50">Update</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction?.type === 'cancel'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          handleCancel(confirmAction.id, 'Cancelled by admin');
        }}
        title="Cancel order"
        message="This will cancel the order. Are you sure?"
        variant="danger"
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
