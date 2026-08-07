'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/features/cart/store';

const HIDE_DELAY = 8000;

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
        className={`mx-auto max-w-7xl flex items-center justify-between gap-3 rounded-2xl bg-slate-900 text-white px-4 py-3 border border-white/10 shadow-z-modal hover:brightness-125 transition-[filter] ${
          visible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div>
          <p className="text-xs font-bold leading-tight">
            {count} item{count > 1 ? 's' : ''} · ₹{total()}
          </p>
          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Taxes &amp; fees calculated at checkout</p>
        </div>
        <span className="shrink-0 inline-flex items-center justify-center bg-zred text-white text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-zred-dark transition-colors">
          View Cart
        </span>
      </Link>
    </div>
  );
}