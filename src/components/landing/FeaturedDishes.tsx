'use client';

import Image from 'next/image';
import { useRef, useState, useCallback } from 'react';
import { useCartStore } from '@/features/cart/store';
import { ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react';
import FavoriteButton from '@/components/shared/FavoriteButton';

const dishes = [
  { id: 'featured-1', name: 'Chicken Thali', image: '/images/Chicken Curry.jpg', price: 70, veg: false, desc: 'Complete thali with rice, dal & chicken curry' },
  { id: 'featured-5', name: 'Pork Thali', image: '/images/Pork Thali.webp', price: 70, veg: false, desc: 'Complete thali with rice, dal & pork curry' },
  { id: 'featured-2', name: 'Veg Thali', image: '/images/Aloo Posto.jpg', price: 60, veg: true, desc: 'Complete thali with rice, dal & sabzi' },
  { id: 'featured-3', name: 'Chicken (5 pcs) Gravy', image: '/images/Chicken (5 pcs) Gravy.webp', price: 40, veg: false, desc: '5 pieces of chicken in rich gravy' },
  { id: 'featured-4', name: 'Pork (5 pcs) Gravy', image: '/images/Pork(5 pcs) Gravy.jpg', price: 40, veg: false, desc: '5 pieces of pork in rich gravy' },
];

export default function FeaturedDishes() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const { addItem, items, setLastAddedRect, updateQuantity } = useCartStore();

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
    setTimeout(updateScrollState, 350);
  }

  function getQty(id: string) {
    return items.find((i) => i.id === id)?.quantity ?? 0;
  }

  function handleAdd(dish: (typeof dishes)[0], e?: React.MouseEvent<HTMLButtonElement>) {
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setLastAddedRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    }
    addItem({ id: dish.id, name: dish.name, price: dish.price, veg: dish.veg, image: dish.image });
  }

  return (
    <section className="py-5 sm:py-8 bg-zgray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ztext tracking-tight">
              Today&apos;s Specials
            </h2>
            <p className="text-xs text-ztext-light mt-0.5">Fresh from the kitchen</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="w-8 h-8 rounded-full bg-zcard border border-zborder flex items-center justify-center text-ztext hover:bg-zsurface transition-colors disabled:opacity-30"
              aria-label="Scroll left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="w-8 h-8 rounded-full bg-zcard border border-zborder flex items-center justify-center text-ztext hover:bg-zsurface transition-colors disabled:opacity-30"
              aria-label="Scroll right"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {dishes.map((dish) => {
            const qty = getQty(dish.id);
            return (
              <div
                key={dish.id}
                className="flex-none w-[200px] sm:w-[220px] rounded-xl overflow-hidden bg-zcard border border-zborder card-lift"
              >
                <div className="relative h-28 sm:h-32 overflow-hidden">
                  <Image
                    src={dish.image}
                    alt={dish.name}
                    fill
                    className="object-cover"
                    sizes="220px"
                    loading="lazy"
                  />
                  <div className={`absolute top-2 left-2 w-4 h-4 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-sm shadow-sm border ${dish.veg ? 'border-green-600' : 'border-red-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${dish.veg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                  </div>
                  <FavoriteButton item={{ ...dish, img: dish.image }} />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-ztext text-xs truncate">{dish.name}</h3>
                  <p className="text-[10px] text-ztext-lighter mt-0.5 truncate">{dish.desc}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-bold text-ztext">₹{dish.price}</p>
                    {qty === 0 ? (
                      <button
                        onClick={(e) => handleAdd(dish, e)}
                        className="w-16 h-7 flex items-center justify-center text-[10px] font-bold text-zred-dark border border-zred-dark rounded-lg hover:bg-zred-dark hover:text-white transition-colors"
                      >
                        ADD
                      </button>
                    ) : (
                      <div className="w-16 h-7 flex items-center justify-between bg-zred text-white rounded-lg px-1">
                        <button onClick={() => updateQuantity(dish.id, qty - 1)} className="p-0.5 hover:bg-white/20 rounded transition-colors flex items-center justify-center"><Minus size={12} /></button>
                        <span className="text-[10px] font-bold text-center">{qty}</span>
                        <button onClick={() => updateQuantity(dish.id, qty + 1)} className="p-0.5 hover:bg-white/20 rounded transition-colors flex items-center justify-center"><Plus size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>


      </div>
    </section>
  );
}
