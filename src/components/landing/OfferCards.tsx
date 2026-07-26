'use client';

import Image from 'next/image';
import { Plus, Minus, Flame } from 'lucide-react';
import { useCartStore } from '@/features/cart/store';

const popularPicks = [
  { id: 'offer-1', name: 'Kolkata Biryani', image: '/images/Kolkata_biryani.jpg', price: 280, veg: false },
  { id: 'offer-2', name: 'Macher Jhol', image: '/images/Macher Jhol.jpg', price: 220, veg: false },
  { id: 'offer-3', name: 'Shorshe Ilish', image: '/images/Shorshe Ilish.jpg', price: 350, veg: false },
  { id: 'offer-4', name: 'Mutton Kosha', image: '/images/Mutton Kosha.jpg', price: 320, veg: false },
  { id: 'offer-5', name: 'Misti Doi', image: '/images/Misti Doi.jpg', price: 80, veg: true },
  { id: 'offer-6', name: 'Daal & Rice', image: '/images/Daal-and-Rice.jpg', price: 160, veg: true },
];

export default function OfferCards() {
  const { addItem, items, setLastAddedRect, updateQuantity } = useCartStore();

  function getQty(id: string) {
    return items.find((i) => i.id === id)?.quantity ?? 0;
  }

  function handleAdd(pick: (typeof popularPicks)[0], e?: React.MouseEvent<HTMLButtonElement>) {
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setLastAddedRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    }
    addItem({ id: pick.id, name: pick.name, price: pick.price, veg: pick.veg, image: pick.image });
  }

  return (
    <section className="py-5 sm:py-8 bg-zbg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-base sm:text-lg font-bold text-ztext mb-4 flex items-center gap-1.5">
          <Flame size={18} className="text-zred" /> Popular Picks
        </h2>

        <div
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {popularPicks.map((pick) => {
            const qty = getQty(pick.id);
            return (
              <div
                key={pick.id}
                className="flex-none w-[120px] sm:w-[140px] text-center"
                style={{ scrollSnapAlign: 'start' }}
              >
                {/* Round image */}
                <div className="relative w-[90px] h-[90px] sm:w-[105px] sm:h-[105px] mx-auto rounded-full overflow-hidden border-2 border-zborder bg-zgray">
                  <Image
                    src={pick.image}
                    alt={pick.name}
                    fill
                    className="object-cover"
                    sizes="105px"
                    loading="lazy"
                    unoptimized
                  />
                </div>

                {/* Name + price */}
                <p className="font-semibold text-ztext text-xs mt-2 truncate">{pick.name}</p>
                <p className="text-xs text-ztext-light mt-0.5">₹{pick.price}</p>

                {/* Add / quantity control */}
                <div className="mt-1.5 flex justify-center">
                  {qty === 0 ? (
                    <button
                      onClick={(e) => handleAdd(pick, e)}
                      className="w-[72px] h-7 flex items-center justify-center gap-1 text-[11px] font-bold text-zred border border-zred rounded-full hover:bg-zred hover:text-white transition-colors"
                    >
                      <Plus size={10} /> ADD
                    </button>
                  ) : (
                    <div className="w-[72px] h-7 flex items-center justify-between bg-zred text-white rounded-full px-1.5">
                      <button onClick={() => updateQuantity(pick.id, qty - 1)} className="p-1 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center" aria-label={`Decrease ${pick.name}`}>
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{qty}</span>
                      <button onClick={() => updateQuantity(pick.id, qty + 1)} className="p-1 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center" aria-label={`Increase ${pick.name}`}>
                        <Plus size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
