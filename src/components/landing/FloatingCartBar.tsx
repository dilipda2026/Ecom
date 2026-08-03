'use client';

import Link from 'next/link';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/features/cart/store';

export default function FloatingCartBar() {
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sticky-above-nav pointer-events-none">
      <Link
        href="/cart"
        className="pointer-events-auto mx-auto max-w-7xl flex items-center justify-between gap-3 rounded-2xl bg-zred px-4 py-3 shadow-z-modal animate-fade-up hover:brightness-105 transition-[filter]"
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
