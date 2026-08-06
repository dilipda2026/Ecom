'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useCartStore } from '@/features/cart/store';
import { Search, Banknote, Star } from 'lucide-react';
import DishCard from '@/components/shared/DishCard';
import Reveal from '@/components/shared/Reveal';
import type { MenuItem, MenuSection } from '@/features/menu/data';

function initialFromUrl(): { category: string; vegOnly: boolean; priceCap: number | null; popularOnly: boolean } {
  if (typeof window === 'undefined') {
    return { category: 'All', vegOnly: false, priceCap: null, popularOnly: false };
  }
  const q = new URLSearchParams(window.location.search);
  const max = Number(q.get('max'));
  return {
    category: q.get('category') ?? 'All',
    vegOnly: q.get('veg') === '1',
    priceCap: max > 0 ? max : null,
    popularOnly: q.get('popular') === '1',
  };
}

export function MenuItems({ sections }: { sections: MenuSection[] }) {
  const store = useCartStore();
  const { items: cartItems, addItem, setLastAddedRect, updateQuantity } = store;
  const initial = initialFromUrl();
  const [activeCategory, setActiveCategory] = useState(initial.category);
  const [vegOnly, setVegOnly] = useState(initial.vegOnly);
  const [priceCap, setPriceCap] = useState<number | null>(initial.priceCap);
  const [popularOnly, setPopularOnly] = useState(initial.popularOnly);
  const [searchQuery, setSearchQuery] = useState('');

  function getQty(id: string) {
    return cartItems.find((i) => i.id === id)?.quantity ?? 0;
  }

  function handleAdd(item: MenuItem, e?: React.MouseEvent<HTMLButtonElement>) {
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setLastAddedRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    }
    addItem({ id: item.id, name: item.name, price: item.price, veg: item.veg, image: item.img });
  }

  function handleCategoryClick(category: string) {
    setActiveCategory(category);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  }

  const baseSections = activeCategory === 'All'
    ? sections
    : sections.filter((s) => s.category === activeCategory);

  const filteredSections = baseSections.map((s) => ({
    ...s,
    items: s.items.filter((i) => {
      if (vegOnly && !i.veg) return false;
      if (priceCap && i.price > priceCap) return false;
      if (popularOnly && !i.popular) return false;
      if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }),
  })).filter((s) => s.items.length > 0);

  const allItems = filteredSections.flatMap((s) => s.items);
  const fallbackImage = sections[0]?.items[0]?.img ?? '/images/Chicken Curry.jpg';

  return (
    <div>
      {/* Search and Veg toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ztext-muted" />
          <input
            type="text"
            placeholder="Search for dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-zcard border border-zborder rounded-xl text-sm focus:outline-none focus:border-zred transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto bg-zcard border border-zborder px-3 py-2 rounded-xl">
          <div className="w-3.5 h-3.5 flex items-center justify-center border border-green-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          </div>
          <span className="text-xs font-bold text-ztext mr-1">Veg</span>
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors relative focus:outline-none ${
              vegOnly ? 'bg-green-500' : 'bg-zgray border border-zborder'
            }`}
            aria-label="Toggle vegetarian only"
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                vegOnly ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="chip-row">
        <button
          onClick={() => setPriceCap(priceCap ? null : 200)}
          className={`pill ${priceCap ? 'active' : ''}`}
        >
          <Banknote size={12} /> Under ₹200
        </button>
        <button
          onClick={() => setPopularOnly(!popularOnly)}
          className={`pill ${popularOnly ? 'active' : ''}`}
        >
          <Star size={12} /> Bestsellers
        </button>
        <button
          onClick={() => setVegOnly(!vegOnly)}
          className={`pill ${vegOnly ? 'active' : ''}`}
        >
          Veg only
        </button>
      </div>

      {/* Category pills (circular images) */}
      <div className="category-rail mt-5 bg-zbg z-40 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button onClick={() => handleCategoryClick('All')} className={`category-item ${activeCategory === 'All' ? 'active' : ''}`}>
          <Image src={fallbackImage} alt="All" width={68} height={68} className="category-avatar" loading="lazy" />
          <span className="category-label">All</span>
        </button>
        {sections.map((s) => (
          <button
            key={s.category}
            onClick={() => handleCategoryClick(s.category)}
            className={`category-item ${activeCategory === s.category ? 'active' : ''}`}
          >
            <Image src={s.items[0]?.img ?? fallbackImage} alt={s.category} width={68} height={68} className="category-avatar" loading="lazy" />
            <span className="category-label">{s.category}</span>
          </button>
        ))}
      </div>

      {/* Menu items grid */}
      {allItems.length === 0 ? (
        <p className="text-sm text-ztext-light mt-6">No dishes match your filters.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-3.5 gap-y-6 mt-6">
          {allItems.map((item, i) => (
            <Reveal key={item.id} delay={Math.min(i * 40, 240)} className="h-full">
              <DishCard
                dish={item}
                qty={getQty(item.id)}
                onAdd={(e) => handleAdd(item, e)}
                onUpdateQuantity={(delta) => updateQuantity(item.id, getQty(item.id) + delta)}
              />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
