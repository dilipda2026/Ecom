'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartStore } from '@/features/cart/types';

const defaultPricing = { deliveryFee: 10, maintenanceFee: 1 };

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [] as CartItem[],
      lastAddedAt: null as number | null,
      lastViewedAt: null as number | null,
      lastAddedRect: null as { left: number; top: number; width: number; height: number } | null,
      pricing: defaultPricing,
      orderType: 'room_delivery' as const,

      addItem: (item, quantity = 1) => {
        const qtyToAdd = Math.max(1, quantity);
        const existing = get().items.find((i) => i.id === item.id);
        if (existing) {
          set({ items: get().items.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + qtyToAdd } : i), lastAddedAt: Date.now() });
        } else {
          set({ items: [...get().items, { ...item, quantity: qtyToAdd }], lastAddedAt: Date.now() });
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

      setOrderType: (orderType) => set({ orderType }),

      syncPrices: (menuItems) => {
        if (!menuItems || menuItems.length === 0) return;
        const map = new Map<string, { id: string; name: string; price: number; img?: string; veg?: boolean }>();
        for (const m of menuItems) {
          map.set(m.id, m);
        }
        set({
          items: get().items.map((cartItem) => {
            const fresh = map.get(cartItem.id);
            if (!fresh) return cartItem;
            return {
              ...cartItem,
              name: fresh.name || cartItem.name,
              price: Number(fresh.price),
              veg: fresh.veg ?? cartItem.veg,
              image: fresh.img || cartItem.image,
            };
          }),
        });
      },

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      deliveryFee: () => get().items.length > 0 && get().orderType !== 'takeaway' ? get().pricing.deliveryFee : 0,
      maintenanceFee: () => get().items.length > 0 ? get().pricing.maintenanceFee : 0,
      total: () => get().subtotal() + get().deliveryFee() + get().maintenanceFee(),
    }),
    { name: 'dilipda-cart', partialize: (state) => ({ items: state.items, lastAddedAt: state.lastAddedAt, lastViewedAt: state.lastViewedAt, orderType: state.orderType }) },
  ),
);
