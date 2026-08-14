export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  veg: boolean;
  image: string;
}

export interface CartState {
  items: CartItem[];
  lastAddedAt: number | null;
  lastViewedAt: number | null;
  lastAddedRect: { left: number; top: number; width: number; height: number } | null;
  pricing: { deliveryFee: number; taxRate: number };
}

export interface CartStore extends CartState {
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  setLastAddedRect: (rect: { left: number; top: number; width: number; height: number } | null) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  markCartViewed: () => void;
  setPricing: (pricing: { deliveryFee: number; taxRate: number }) => void;
  totalItems: () => number;
  subtotal: () => number;
  deliveryFee: () => number;
  taxAmount: () => number;
  total: () => number;
}
