'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/features/cart/store';
import { useAuthStore } from '@/features/auth/store';

export default function CartPage() {
  const router = useRouter();
  const store = useCartStore();
  const { items, updateQuantity, removeItem, clearCart, subtotal, deliveryFee, taxAmount, total, totalItems } = store;
  const { isAuthenticated, isLoading } = useAuthStore();
  const count = totalItems();

  function goToCheckout() {
    if (isLoading) return;
    router.push(isAuthenticated ? '/checkout' : '/auth/login?next=/checkout');
  }

  if (items.length === 0) {
    return (
      <div className="page-pad">
        <div className="container-z mx-auto max-w-3xl">
          <h1 className="text-xl font-bold text-ztext">Your bag</h1>
          <div className="mt-8 bg-zcard rounded-xl shadow-z p-12 text-center">
            <ShoppingBag size={48} className="mx-auto mb-4" style={{ color: '#9C9C9C' }} />
            <p className="text-sm font-medium text-ztext-light">Your bag is empty</p>
            <p className="mt-1 text-sm text-ztext-lighter">Browse our menu and add items to get started.</p>
            <Link href="/menu" className="button-z button-z-primary mt-6">Browse menu</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-pad">
      <div className="container-z mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-ztext">Your bag</h1>
            <p className="text-ztext-light text-xs mt-0.5">Dilip Da • {count} item{count > 1 ? 's' : ''}</p>
          </div>
          <button onClick={clearCart} className="text-xs text-ztext-lighter hover:text-zred transition-colors">Clear</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-zcard rounded-xl shadow-z p-3 sm:p-4 flex gap-3 items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-zgray shrink-0 relative">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-ztext text-sm truncate">{item.name}</h2>
                  <p className="text-xs font-medium text-ztext-light mt-0.5">₹{item.price}</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1 border border-zborder rounded-lg">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Decrease quantity of ${item.name}`} className="p-1.5 hover:bg-zgray transition-colors rounded-l-lg"><Minus size={12} /></button>
                    <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`Increase quantity of ${item.name}`} className="p-1.5 hover:bg-zgray transition-colors rounded-r-lg"><Plus size={12} /></button>
                  </div>
                  <p className="font-bold text-ztext w-12 text-right text-xs sm:text-sm">₹{item.price * item.quantity}</p>
                  <button onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name} from cart`} className="p-1 text-ztext-lighter hover:text-zred transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            <Link href="/menu" className="inline-flex items-center gap-1 text-xs font-medium text-zred hover:underline mt-2">
              <ArrowLeft size={12} /> Add more items
            </Link>
          </div>

          {/* Bill summary — sticky on desktop, bottom bar on mobile */}
          <div className="hidden lg:block">
            <div className="bg-zcard rounded-xl shadow-z p-5 sticky top-24">
              <h2 className="font-bold text-ztext text-sm mb-3">Bill details</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-ztext-light"><span>Item total</span><span className="font-medium text-ztext">₹{subtotal()}</span></div>
                <div className="flex justify-between text-ztext-light"><span>Delivery fee</span><span className="font-medium text-ztext">{deliveryFee() > 0 ? `₹${deliveryFee()}` : 'Free'}</span></div>
                <div className="flex justify-between text-ztext-light"><span>Tax</span><span className="font-medium text-ztext">₹{taxAmount()}</span></div>
                <div className="border-t border-zborder pt-2 flex justify-between font-bold text-ztext text-sm"><span>Total</span><span>₹{total()}</span></div>
              </div>
              <button onClick={goToCheckout} className="button-z button-z-primary w-full mt-4 h-10 text-sm font-bold">
                Proceed to checkout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile sticky checkout bar */}
        <div className="lg:hidden sticky bottom-0 sticky-above-nav bg-zcard border-t border-zborder shadow-z-modal -mx-4 px-4 py-3 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-ztext-light">{count} item{count > 1 ? 's' : ''} • ₹{subtotal()} + ₹{deliveryFee() + taxAmount()} fees</p>
              <p className="text-sm font-bold text-ztext">₹{total()}</p>
            </div>
            <button onClick={goToCheckout} className="button-z button-z-primary text-xs font-bold px-5 h-9">
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
