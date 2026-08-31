'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  Search, UtensilsCrossed, Leaf, Lock, RefreshCw, Eye, Package,
  Layers, AlertCircle, Clock, Sparkles,
} from 'lucide-react';
import { getOwnerProducts, getOwnerCategories } from '@/features/owner/actions';
import type { Product, Category } from '@/features/products/types';

export default function OwnerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      getOwnerProducts({
        search: search.trim() || undefined,
        category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
        deletedOnly: view === 'archived',
        includeDeleted: view === 'archived',
      }),
      getOwnerCategories(),
    ]);

    if (prodRes.success && prodRes.data) {
      setProducts(prodRes.data);
    }
    if (catRes.success && catRes.data) {
      setCategories(catRes.data);
    }
    setLoading(false);
  }, [search, selectedCategory, view]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ztext flex items-center gap-2.5">
            <UtensilsCrossed className="text-zred" size={24} />
            Products & Menu Items
          </h1>
          <p className="text-xs sm:text-sm text-ztext-light mt-0.5">
            Read-only menu catalog, pricing, availability, and packaging packet requirements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ztext-muted bg-zcard rounded-xl border border-zborder">
            <Lock size={13} />
            Read-only
          </span>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl hover:bg-zgray text-ztext-light border border-zborder transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-zcard p-4 rounded-2xl border border-zborder shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ztext-lighter" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, description..."
              className="input-z w-full pl-9 text-xs h-10"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-z text-xs h-10 flex-1 sm:w-48"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex bg-zgray p-1 rounded-xl border border-zborder shrink-0">
              <button
                onClick={() => setView('active')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  view === 'active' ? 'bg-zcard text-ztext shadow-xs' : 'text-ztext-lighter hover:text-ztext'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setView('archived')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  view === 'archived' ? 'bg-zcard text-ztext shadow-xs' : 'text-ztext-lighter hover:text-ztext'
                }`}
              >
                Archived
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading && products.length === 0 ? (
        <div className="py-16 text-center text-ztext-lighter text-sm">
          Loading menu items...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-zcard rounded-2xl border border-zborder p-12 text-center text-ztext-lighter">
          <UtensilsCrossed size={36} className="mx-auto mb-3 text-ztext-muted opacity-40" />
          <p className="font-semibold text-ztext">No products found</p>
          <p className="text-xs text-ztext-light mt-1">Try adjusting your search query or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => {
            const categoryName = p.category_id ? categoryMap.get(p.category_id) : 'Uncategorized';
            const bigPackets = p.packaging_big_qty ?? 0;
            const smallPackets = p.packaging_small_qty ?? 0;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="bg-zcard rounded-2xl border border-zborder shadow-sm overflow-hidden hover:border-ztext-light/30 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative h-40 w-full bg-zgray overflow-hidden">
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ztext-lighter">
                        <UtensilsCrossed size={32} className="opacity-30" />
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.is_vegetarian
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-red-500/90 text-white'
                      }`}>
                        <Leaf size={10} />
                        {p.is_vegetarian ? 'Veg' : 'Non-Veg'}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.is_available
                          ? 'bg-black/60 text-emerald-400 backdrop-blur-xs'
                          : 'bg-black/60 text-red-400 backdrop-blur-xs'
                      }`}>
                        {p.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-semibold text-zred uppercase tracking-wider">
                          {categoryName}
                        </span>
                        <h3 className="text-sm font-bold text-ztext line-clamp-1">{p.name}</h3>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-ztext">₹{p.price}</span>
                        {p.compare_at_price && p.compare_at_price > p.price && (
                          <span className="block text-[11px] text-ztext-lighter line-through">₹{p.compare_at_price}</span>
                        )}
                      </div>
                    </div>

                    {p.description && (
                      <p className="text-xs text-ztext-light line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}

                    {/* Packaging Info Badge */}
                    <div className="pt-2 border-t border-zborder/60 flex items-center justify-between text-[11px] text-ztext-muted">
                      <span className="flex items-center gap-1">
                        <Package size={13} className="text-zred" />
                        Packets:
                      </span>
                      <span className="font-semibold text-ztext">
                        {bigPackets > 0 || smallPackets > 0
                          ? `${bigPackets > 0 ? `${bigPackets} Big` : ''}${bigPackets > 0 && smallPackets > 0 ? ' + ' : ''}${smallPackets > 0 ? `${smallPackets} Small` : ''}`
                          : 'None (₹0)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer details */}
                <div className="px-4 py-2.5 bg-zgray/50 border-t border-zborder flex items-center justify-between text-[11px] text-ztext-lighter">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {p.preparation_time ?? 15} mins
                  </span>
                  <span>Stock: {p.stock_quantity}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-zcard rounded-2xl max-w-lg w-full border border-zborder shadow-z-modal overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-zred uppercase tracking-wider">
                  {selectedProduct.category_id ? categoryMap.get(selectedProduct.category_id) : 'Uncategorized'}
                </span>
                <h2 className="text-lg font-bold text-ztext">{selectedProduct.name}</h2>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-lg text-ztext-lighter hover:text-ztext hover:bg-zgray transition-colors"
              >
                ✕
              </button>
            </div>

            {selectedProduct.image && (
              <div className="relative h-48 w-full rounded-xl overflow-hidden bg-zgray">
                <Image
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs bg-zgray/50 p-3 rounded-xl border border-zborder">
              <div>
                <span className="text-ztext-lighter">Price:</span>
                <span className="font-bold text-ztext ml-1.5 text-sm">₹{selectedProduct.price}</span>
              </div>
              <div>
                <span className="text-ztext-lighter">Veg / Non-Veg:</span>
                <span className="font-bold text-ztext ml-1.5">
                  {selectedProduct.is_vegetarian ? '🌱 Vegetarian' : '🍗 Non-Vegetarian'}
                </span>
              </div>
              <div>
                <span className="text-ztext-lighter">Prep Time:</span>
                <span className="font-bold text-ztext ml-1.5">{selectedProduct.preparation_time ?? 15} mins</span>
              </div>
              <div>
                <span className="text-ztext-lighter">Stock Quantity:</span>
                <span className="font-bold text-ztext ml-1.5">{selectedProduct.stock_quantity}</span>
              </div>
              <div>
                <span className="text-ztext-lighter">Big Packets:</span>
                <span className="font-bold text-ztext ml-1.5">{selectedProduct.packaging_big_qty ?? 0}</span>
              </div>
              <div>
                <span className="text-ztext-lighter">Small Packets:</span>
                <span className="font-bold text-ztext ml-1.5">{selectedProduct.packaging_small_qty ?? 0}</span>
              </div>
            </div>

            {selectedProduct.description && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-ztext uppercase tracking-wider">Description</h4>
                <p className="text-xs text-ztext-light leading-relaxed">{selectedProduct.description}</p>
              </div>
            )}

            {selectedProduct.full_description && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-ztext uppercase tracking-wider">Full Details</h4>
                <p className="text-xs text-ztext-light leading-relaxed">{selectedProduct.full_description}</p>
              </div>
            )}

            {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-ztext uppercase tracking-wider">Ingredients</h4>
                <p className="text-xs text-ztext-light">{selectedProduct.ingredients.join(', ')}</p>
              </div>
            )}

            <button
              onClick={() => setSelectedProduct(null)}
              className="button-z button-z-secondary w-full text-xs font-semibold py-2.5 mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
