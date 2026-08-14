'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartStore } from '@/features/cart/types';

const defaultPricing = { deliveryFee: 10, taxRate: 0.05 };

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [] as CartItem[],
      lastAddedAt: null as number | null,
      lastViewedAt: null as number | null,
      lastAddedRect: null as { left: number; top: number; width: number; height: number } | null,
      pricing: defaultPricing,

      addItem: (item) => {
        const existing = get().items.find((i) => i.id === item.id);
        if (existing) {
          set({ items: get().items.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i), lastAddedAt: Date.now() });
        } else {
          set({ items: [...get().items, { ...item, quantity: 1 }], lastAddedAt: Date.now() });
        }
      },

      setLastAddedRect: (rect) => set({ lastAddedRect: rect }),

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) { get().removeItem(id); return; }
        set({ items: get().items.map((i) => i.id === id ? { ...i, quantity } : i) });
      },

      clearCart: () => set({ items: [], lastAddedAt: null }),

      markCartViewed: () => set({ lastViewedAt: Date.now() }),

      setPricing: (pricing) => set({ pricing }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      deliveryFee: () => get().items.length > 0 ? get().pricing.deliveryFee : 0,
      taxAmount: () => Math.round(get().subtotal() * get().pricing.taxRate),
      total: () => get().subtotal() + get().deliveryFee() + get().taxAmount(),
    }),
    { name: 'dilipda-cart', partialize: (state) => ({ items: state.items, lastAddedAt: state.lastAddedAt, lastViewedAt: state.lastViewedAt }) },
  ),
);
