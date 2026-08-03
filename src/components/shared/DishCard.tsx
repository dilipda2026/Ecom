'use client';

import Image from 'next/image';
import { Minus, Plus } from 'lucide-react';
import FavoriteButton from '@/components/shared/FavoriteButton';

export interface DishCardItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  veg: boolean;
  popular: boolean;
  img: string;
}

interface DishCardProps {
  dish: DishCardItem;
  qty: number;
  onAdd: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  onUpdateQuantity: (delta: number) => void;
}

export default function DishCard({ dish, qty, onAdd, onUpdateQuantity }: DishCardProps) {
  return (
    <div className="group relative flex flex-col">
      <div className="relative h-40 sm:h-44 rounded-2xl overflow-hidden bg-zgray shadow-z">
        <Image
          src={dish.img}
          alt={dish.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, 300px"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        <div className={`absolute top-2 left-2 flex items-center justify-center w-4 h-4 rounded-sm bg-white/90 backdrop-blur-sm shadow-sm border ${dish.veg ? 'border-green-600' : 'border-red-600'}`}>
          <div className={`w-2 h-2 rounded-full ${dish.veg ? 'bg-green-600' : 'bg-red-600'}`} />
        </div>
        <FavoriteButton item={{ id: dish.id, name: dish.name, price: dish.price, desc: dish.desc, veg: dish.veg, popular: dish.popular, img: dish.img }} />
        {dish.popular && (
          <span className="absolute left-2 bottom-2 text-[9px] font-bold text-white bg-zred px-1.5 py-0.5 rounded-md shadow-md">
            Bestseller
          </span>
        )}
        <div className="absolute right-2 bottom-2 z-10">
          {qty === 0 ? (
            <button
              onClick={(e) => onAdd(e)}
              className="h-8 min-w-[64px] px-3 flex items-center justify-center gap-1 text-[11px] font-bold text-zred bg-white rounded-lg shadow-md hover:bg-zred/10 transition-colors"
            >
              <Plus size={12} /> ADD
            </button>
          ) : (
            <div className="h-8 flex items-center justify-between bg-white rounded-lg shadow-md px-1">
              <button onClick={() => onUpdateQuantity(-1)} aria-label={`Decrease ${dish.name}`} className="w-7 h-full flex items-center justify-center text-zred hover:bg-zred/10 rounded-lg transition-colors">
                <Minus size={13} />
              </button>
              <span className="w-6 text-center text-xs font-bold text-zinc-800">{qty}</span>
              <button onClick={() => onUpdateQuantity(1)} aria-label={`Increase ${dish.name}`} className="w-7 h-full flex items-center justify-center text-zred hover:bg-zred/10 rounded-lg transition-colors">
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${dish.veg ? 'bg-zgreen/10 text-zgreen' : 'bg-zred/10 text-zred'}`}>
          {dish.veg ? 'VEG' : 'NON-VEG'}
        </span>
        <h3 className="mt-1 text-sm font-bold text-ztext leading-snug line-clamp-2 min-h-[2.5em]">{dish.name}</h3>
        <p className="text-xs text-ztext-light mt-0.5 line-clamp-1">{dish.desc}</p>
        <p className="mt-1.5 text-sm font-bold text-ztext">₹{dish.price}</p>
      </div>
    </div>
  );
}
