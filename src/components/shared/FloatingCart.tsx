'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/features/cart/store';

const HIDE_DELAY = 5000;

export default function FloatingCart() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pathname = usePathname();
  const { totalItems, lastAddedAt } = useCartStore();
  const cartCount = mounted ? totalItems() : 0;

  const shouldShow = cartCount > 0 &&
    pathname !== '/orders' && pathname !== '/checkout' && !pathname?.startsWith('/admin');

  if (!shouldShow) return null;

  return <CartPopup key={lastAddedAt} />;
}

function CartPopup() {
  const { total, totalItems } = useCartStore();
  const cartCount = totalItems();
  const [phase, setPhase] = useState<'visible' | 'leaving' | 'hidden'>('visible');
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hideTimer = setTimeout(() => {
      setPhase('leaving');
      leaveTimerRef.current = setTimeout(() => setPhase('hidden'), 200);
    }, HIDE_DELAY);
    return () => {
      clearTimeout(hideTimer);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-[60] transition-all duration-200 ${
        phase === 'leaving' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-zcard border border-zborder rounded-2xl shadow-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zred/10 flex items-center justify-center">
            <ShoppingBag size={20} className="text-zred" />
          </div>
          <div>
            <p className="text-sm font-bold text-ztext">{cartCount} item{cartCount > 1 ? 's' : ''}</p>
            <p className="text-xs text-ztext-light mt-0.5">₹{total()}</p>
          </div>
        </div>
        <Link href="/orders" className="button-z button-z-primary text-sm px-6 py-2.5 shadow-sm rounded-xl">
          View cart
        </Link>
      </div>
    </div>
  );
}
