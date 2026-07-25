'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Bike, MapPin, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getUserOrder } from '@/features/orders/actions/customer';
import type { Order, OrderItem } from '@/features/orders/types';

function OrderConfirmedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(!!orderId);

  useEffect(() => {
    if (!orderId) return;
    getUserOrder(orderId).then((res) => {
      if (res.success && res.data) setOrder(res.data);
      setLoading(false);
    });
  }, [orderId]);

  const address = order?.delivery_address as Record<string, string> | null;

  return (
    <>
      <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto text-zgreen">
        <CheckCircle size={40} />
      </div>
      <h1 className="text-2xl font-bold text-ztext mt-6">Order placed!</h1>
      <p className="text-ztext-light mt-2">Your order has been received and is being prepared.</p>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-ztext-lighter" /></div>
      ) : order ? (
        <>
          <div className="bg-zcard rounded-xl shadow-z p-6 mt-8 text-left">
            <p className="font-semibold text-ztext mb-3 text-sm">Items</p>
            <div className="space-y-2">
              {order.order_items?.map((item: OrderItem) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-ztext">{item.quantity}x {item.product_name}</span>
                  <span className="font-medium text-ztext">₹{item.subtotal}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zborder mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-ztext-light"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
              <div className="flex justify-between text-ztext-light"><span>Delivery</span><span>{order.delivery_fee > 0 ? `₹${order.delivery_fee}` : 'Free'}</span></div>
              <div className="flex justify-between text-ztext-light"><span>Tax</span><span>₹{order.tax_amount}</span></div>
              <div className="flex justify-between font-bold text-ztext pt-1"><span>Total</span><span>₹{order.total}</span></div>
            </div>
          </div>

          <div className="bg-zcard rounded-xl shadow-z p-6 mt-4 text-left">
            <div className="flex items-center gap-3 text-sm">
              <Bike size={18} className="text-zred" />
              <div>
                <p className="font-semibold text-ztext">Delivery partner will be assigned soon</p>
                <p className="text-xs text-ztext-light mt-0.5">Expected delivery in 25–35 minutes</p>
              </div>
            </div>
            {address && (
              <div className="flex items-center gap-3 text-sm mt-4 pt-4 border-t border-zborder">
                <MapPin size={18} className="text-zred" />
                <div>
                  <p className="font-semibold text-ztext">Delivering to</p>
                  <p className="text-xs text-ztext-light mt-0.5">
                    {address.address}{address.city ? `, ${address.city}` : ''}{address.pincode ? ` - ${address.pincode}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-zcard rounded-xl shadow-z p-6 mt-4">
            <p className="text-sm text-ztext-light">Tracking code</p>
            <p className="text-2xl font-black text-ztext tracking-wider mt-1">{order.tracking_code}</p>
          </div>
        </>
      ) : (
        <div className="bg-zcard rounded-xl shadow-z p-6 mt-8">
          <p className="text-ztext-light text-sm">Order details are being processed. Check your orders page for updates.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Link href="/orders" className="button-z button-z-primary flex-1 h-12">My orders</Link>
        <Link href="/" className="button-z button-z-outline flex-1 h-12">Order again</Link>
      </div>
    </>
  );
}

export default function OrderConfirmedPage() {
  return (
    <div className="page-pad">
      <div className="container-z mx-auto max-w-lg text-center py-12">
        <Suspense fallback={
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin text-zgreen" />
            </div>
            <p className="text-ztext-light">Loading order details...</p>
          </div>
        }>
          <OrderConfirmedContent />
        </Suspense>
      </div>
    </div>
  );
}