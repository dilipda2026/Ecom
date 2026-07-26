'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useCartStore } from '@/features/cart/store';
import { Minus, Plus, Search } from 'lucide-react';
import FavoriteButton from '@/components/shared/FavoriteButton';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  veg: boolean;
  popular: boolean;
  img: string;
}

interface MenuSection {
  category: string;
  items: MenuItem[];
}

export function MenuItems({ sections }: { sections: MenuSection[] }) {
  const store = useCartStore();
  const { items: cartItems, addItem, setLastAddedRect, updateQuantity } = store;
  const [activeCategory, setActiveCategory] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
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
    : sections.filter(s => s.category === activeCategory);

  const filteredSections = baseSections.map((s) => ({
    ...s,
    items: s.items.filter((i) => {
      if (vegOnly && !i.veg) return false;
      if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }),
  })).filter((s) => s.items.length > 0);

  function renderItem(item: MenuItem) {
    const qty = getQty(item.id);
    return (
      <div key={item.id} className="p-4 flex gap-4 bg-zcard rounded-xl border border-zborder card-lift">
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-3.5 h-3.5 flex items-center justify-center border ${item.veg ? 'border-green-500' : 'border-red-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${item.veg ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              {item.popular && <span className="text-[10px] font-bold text-zred bg-zred/10 px-1.5 py-0.5 rounded">Bestseller</span>}
            </div>
            <h3 className="font-semibold text-ztext text-sm sm:text-base mt-0.5">{item.name}</h3>
            <p className="text-sm font-bold text-ztext mt-1">₹{item.price}</p>
          </div>
          <p className="text-xs text-ztext-light mt-2 leading-relaxed line-clamp-2">{item.desc}</p>
        </div>
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-zgray relative shadow-sm">
            <Image src={item.img} alt={item.name} fill className="object-cover" sizes="(max-width: 640px) 96px, 112px" />
            <FavoriteButton item={item} />
          </div>
          <div className="-mt-7 z-10 relative bg-zcard rounded-lg shadow-sm border border-zborder overflow-hidden">
            {qty === 0 ? (
              <button onClick={(e) => handleAdd(item, e)} className="w-20 h-8 flex items-center justify-center text-xs font-bold text-zred-dark hover:bg-zred-dark hover:text-white transition-colors">
                ADD
              </button>
            ) : (
              <div className="w-20 h-8 flex items-center justify-between bg-zred text-white px-1">
                <button onClick={() => updateQuantity(item.id, qty - 1)} aria-label={`Decrease quantity of ${item.name}`} className="p-1 hover:bg-white/20 rounded transition-colors flex items-center justify-center"><Minus size={14} /></button>
                <span className="text-xs font-bold text-center">{qty}</span>
                <button onClick={() => updateQuantity(item.id, qty + 1)} aria-label={`Increase quantity of ${item.name}`} className="p-1 hover:bg-white/20 rounded transition-colors flex items-center justify-center"><Plus size={14} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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

      {/* Category pills */}
      <div className="category-pills sticky top-16 bg-zbg z-40 py-2 -mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 mb-2">
        <button
          onClick={() => handleCategoryClick('All')}
          className={`pill ${activeCategory === 'All' ? 'active' : ''}`}
        >
          All
        </button>
        {sections.map((s) => (
          <button
            key={s.category}
            onClick={() => handleCategoryClick(s.category)}
            className={`pill ${activeCategory === s.category ? 'active' : ''}`}
          >
            {s.category}
          </button>
        ))}
      </div>

      {/* Menu items grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
        {filteredSections.flatMap(section => section.items).map(renderItem)}
      </div>
    </div>
  );
}
