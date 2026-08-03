'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/features/cart/store';

const HIDE_DELAY = 4000;

export default function FloatingCartBar() {
  const items = useCartStore((s) => s.items);
  const lastAddedAt = useCartStore((s) => s.lastAddedAt);
  const total = useCartStore((s) => s.total);
  const [now, setNow] = useState(() => Date.now());

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = count > 0 && lastAddedAt != null && now - lastAddedAt < HIDE_DELAY;

  if (count === 0) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sticky-above-nav pointer-events-none transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
      }`}
    >
      <Link
        href="/cart"
        className={`mx-auto max-w-7xl flex items-center justify-between gap-3 rounded-2xl bg-zred px-4 py-3 shadow-z-modal hover:brightness-105 transition-[filter] ${
          visible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5 text-white">
          <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <ShoppingBag size={16} />
          </span>
          <div>
            <p className="text-xs font-bold leading-tight">
              {count} item{count > 1 ? 's' : ''} · ₹{total()}
            </p>
            <p className="text-[10px] text-white/85 leading-tight mt-0.5">Delivery fee included</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-white shrink-0">
          View bag <ChevronRight size={14} />
        </span>
      </Link>
    </div>
  );
}