'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, ChefHat, ShoppingBag, Loader2, XCircle, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/features/auth/store';
import { useCartStore } from '@/features/cart/store';
import { getUserOrders, cancelUserOrder } from '@/features/orders/actions/customer';
import type { Order } from '@/features/orders/types';
import { orderTypeLabel } from '@/features/orders/types';
import { showToast } from '@/components/shared/Toast';
import { usePolling } from '@/hooks/usePolling';

const CANCELLATION_WINDOW_MS = 120_000;
const POLL_INTERVAL_MS = 30_000;

function useCountdown(createdAt: string) {
  const [remaining, setRemaining] = useState(() => CANCELLATION_WINDOW_MS - (Date.now() - new Date(createdAt).getTime()));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      const r = CANCELLATION_WINDOW_MS - (Date.now() - new Date(createdAt).getTime());
      setRemaining(r);
      if (r <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [createdAt, remaining]);

  return Math.max(0, remaining);
}

function canCancelByTime(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < CANCELLATION_WINDOW_MS;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-500',
  accepted: 'bg-blue-500/15 text-blue-400',
  preparing: 'bg-orange-500/15 text-orange-400',
  ready: 'bg-green-500/15 text-green-400',
  out_for_delivery: 'bg-blue-500/15 text-blue-400',
  delivered: 'bg-green-500/15 text-green-400',
  completed: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-red-500/15 text-red-400',
};

function OrderCard({ order, onCancel }: { order: Order; onCancel: (id: string, reason: string) => void }) {
  const itemCount = order.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const remaining = useCountdown(order.created_at);
  const timeCanCancel = canCancelByTime(order.created_at);
  const canCancel = timeCanCancel && (order.status === 'pending' || order.status === 'accepted');

  async function handleConfirm() {
    setCancelling(true);
    await onCancel(order.id, cancelReason);
    setCancelling(false);
    setShowConfirm(false);
  }

  return (
    <div className="bg-zcard rounded-xl border border-zborder p-4 sm:p-5 hover:shadow-z-hover transition-shadow">
      <Link href={`/orders/${order.id}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-zgray flex items-center justify-center shrink-0">
              <ChefHat size={18} className="text-zred" />
            </div>
            <div>
              <p className="font-semibold text-ztext text-sm">Dilip Da</p>
              <p className="text-xs text-ztext-lighter">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColors[order.status] ?? 'bg-zgray text-ztext-light'}`}>
            {order.status === 'pending' ? 'Placed' : order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, ' ')}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-zborder">
          <p className="text-xs text-ztext-light line-clamp-2">
            {order.order_items?.map((i) => `${i.quantity}x ${i.product_name}`).join(' • ') || `${itemCount} item(s)`}
          </p>
          <div className="flex items-center justify-between mt-2">
            {order.order_type && (
              <span className="text-[10px] text-ztext-muted font-medium">{orderTypeLabel(order.order_type)}</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm font-bold text-ztext">₹{order.total}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ztext-lighter font-medium">{order.tracking_code}</span>
            </div>
          </div>
        </div>
      </Link>

      {(order.status === 'pending' || order.status === 'accepted') && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] text-ztext-lighter flex items-center gap-1">
            <Clock size={10} />
            {timeCanCancel
              ? `You have ${Math.floor(remaining / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s remaining to cancel`
              : 'Cancellation window has expired. This order can no longer be cancelled.'}
          </p>
          {canCancel && !showConfirm && (
            <button onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/5 transition-colors">
              <XCircle size={13} /> Cancel
            </button>
          )}
        </div>
      )}

      {showConfirm && (
        <div className="mt-3 pt-3 border-t border-zborder" onClick={(e) => e.stopPropagation()}>
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason (optional)"
            className="input-z text-xs w-full"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => { setShowConfirm(false); setCancelReason(''); }} className="flex-1 py-1.5 rounded-lg text-xs font-medium text-ztext-light bg-zgray hover:bg-zsurface transition-colors">Back</button>
            <button onClick={handleConfirm} disabled={cancelling} className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
              {cancelling ? <Loader2 size={12} className="animate-spin" /> : null}
              {cancelling ? 'Cancelling...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<'cart' | 'orders'>('cart');
  const { isAuthenticated } = useAuthStore();
  const { items: cartItems, updateQuantity, removeItem, clearCart, deliveryFee, taxAmount, total, totalItems } = useCartStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const loading = !ordersLoaded && activeTab === 'orders';
  const cartCount = totalItems();

  const loadOrders = useCallback(async () => {
    if (activeTab !== 'orders' || !isAuthenticated) return;
    const res = await getUserOrders(page, 5);
    if (res.success && res.data) {
      setOrders(res.data.orders);
      setTotalPages(res.data.totalPages);
    }
    setOrdersLoaded(true);
  }, [activeTab, page, isAuthenticated]);

  useEffect(() => {
    loadOrders(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadOrders]);

  usePolling(loadOrders, POLL_INTERVAL_MS, activeTab === 'orders' && isAuthenticated);

  async function handleCancelOrder(orderId: string, reason: string) {
    const res = await cancelUserOrder(orderId, reason);
    if (res.success) {
      showToast('Order cancelled');
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'cancelled' as const } : o));
    } else {
      showToast(res.error ?? 'Failed to cancel');
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="page-pad">
        <div className="container-z mx-auto max-w-lg text-center py-16">
          <ClipboardList size={48} className="mx-auto mb-4 text-ztext-muted" />
          <h1 className="text-xl font-bold text-ztext">Sign in to view orders</h1>
          <p className="text-sm text-ztext-light mt-2">
            Log in to see your order history and active cart.
          </p>
          <Link href="/auth/login" className="button-z button-z-primary mt-6">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-pad pb-28">
      <div className="container-z mx-auto max-w-3xl">
        
        <div className="flex items-center gap-2 mb-8 bg-zcard p-1 rounded-2xl border border-zborder max-w-xs mx-auto">
          <button 
            onClick={() => setActiveTab('cart')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'cart' 
                ? 'bg-zgray text-ztext shadow-sm' 
                : 'text-ztext-muted hover:text-ztext-light'
            }`}
          >
            <ShoppingBag size={16} /> Cart {cartCount > 0 && <span className="w-5 h-5 rounded-full bg-zred text-white text-[10px] flex items-center justify-center ml-1">{cartCount}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'orders' 
                ? 'bg-zgray text-ztext shadow-sm' 
                : 'text-ztext-muted hover:text-ztext-light'
            }`}
          >
            <ClipboardList size={16} /> Orders
          </button>
        </div>

        {activeTab === 'cart' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {cartItems.length > 0 ? (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-xl font-bold text-ztext">Active Cart</h1>
                    <p className="text-ztext-light text-xs mt-0.5">{cartCount} item{cartCount > 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={clearCart} className="text-xs text-ztext-lighter hover:text-zred transition-colors">Clear</button>
                </div>

                <div className="bg-zcard rounded-xl border border-zborder p-4 shadow-sm">
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-3 items-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-zgray shrink-0 relative">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-semibold text-ztext text-sm truncate">{item.name}</h2>
                          <p className="text-xs font-medium text-ztext-light mt-0.5">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex items-center gap-1 border border-zborder rounded-lg">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 hover:bg-zgray transition-colors rounded-l-lg">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                            <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 hover:bg-zgray transition-colors rounded-r-lg">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                          </div>
                          <p className="font-bold text-ztext w-12 text-right text-xs sm:text-sm">₹{item.price * item.quantity}</p>
                          <button onClick={() => removeItem(item.id)} className="p-1 text-ztext-lighter hover:text-zred transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-zborder flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-ztext">Total: ₹{total()}</p>
                      <p className="text-[10px] text-ztext-light mt-0.5">Includes ₹{deliveryFee() + taxAmount()} fees</p>
                    </div>
                    <Link href="/checkout" className="button-z button-z-primary text-sm font-bold px-8 h-10 w-full sm:w-auto">
                      Checkout
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zcard rounded-xl border border-zborder p-8 text-center mt-4">
                <ShoppingBag size={40} className="mx-auto mb-4 text-ztext-muted/30" />
                <h1 className="text-xl font-bold text-ztext mb-2">Your cart is empty</h1>
                <p className="text-sm text-ztext-light mb-6">Looks like you haven&apos;t added anything to your cart yet.</p>
                <Link href="/menu" className="button-z button-z-primary px-8">
                  Browse Menu
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-xl font-bold text-ztext mb-1">Past Orders</h1>
            <p className="text-sm text-ztext-light mb-6">Your order history from Dilip Da</p>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-ztext-lighter" /></div>
            ) : orders.length === 0 ? (
              <div className="bg-zcard rounded-xl border border-zborder p-8 text-center mt-4">
                <ClipboardList size={40} className="mx-auto mb-4 text-ztext-muted/30" />
                <p className="text-xl font-bold text-ztext mb-2">No past orders</p>
                <p className="text-sm text-ztext-light mt-1 mb-6">You haven&apos;t placed any orders yet.</p>
                <button onClick={() => setActiveTab('cart')} className="button-z button-z-primary px-8">
                  View Cart
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} onCancel={handleCancelOrder} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      className="button-z button-z-outline text-xs h-8 px-4 disabled:opacity-30"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-ztext-light">{page} of {totalPages}</span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      className="button-z button-z-outline text-xs h-8 px-4 disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}