'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, MapPin } from 'lucide-react';

const slides = [
  { img: '/images/Chicken Curry.jpg', top: 'Fresh thalis', bottom: 'from ₹60', note: 'Chicken, pork & veg thalis made fresh daily' },
  { img: '/images/Pork Thali.webp', top: 'Homestyle gravy', bottom: 'Chicken & Pork', note: 'Rich curries straight from the kitchen' },
  { img: '/images/Aloo Posto.jpg', top: 'Veg & Non-Veg', bottom: 'Both available', note: 'Classic Bengali dishes, every day' },
];

interface HeroProps {
  query: string;
  onQueryChange: (q: string) => void;
  vegOn: boolean;
  onVegToggle: () => void;
}

export default function Hero({ query, onQueryChange, vegOn, onVegToggle }: HeroProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="bg-zbg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* Gradient band header */}
        <div className="hero-band rounded-2xl shadow-z animate-hero-in">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-white/85" />
            <p className="text-xs font-medium text-white/90">Near CIT Kokrajhar, 2nd Gate</p>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Dilip <span className="text-white/90">Da</span>
          </h1>

          <div className="mt-3 flex gap-2.5">
            <div className="flex-1 flex items-center gap-2.5 bg-zcard/95 border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-white/40 transition-colors">
              <Search size={16} className="text-ztext-muted shrink-0" />
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search &quot;chicken thali&quot;"
                className="flex-1 bg-transparent text-sm text-ztext outline-none placeholder:text-ztext-muted min-w-0"
                aria-label="Search dishes"
              />
            </div>
            <button
              onClick={onVegToggle}
              className="flex flex-col items-center justify-center gap-0.5 shrink-0 rounded-xl bg-white/15 border border-white/20 px-2.5 transition-colors hover:bg-white/25"
              aria-label="Toggle veg mode"
              aria-pressed={vegOn}
            >
              <span className="text-[9px] font-bold text-white leading-none">VEG</span>
              <span className="text-[9px] font-bold text-white leading-none">MODE</span>
              <span className={`mt-1 w-8 h-4 rounded-full relative transition-colors ${vegOn ? 'bg-zgreen' : 'bg-white/30'}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${vegOn ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
          </div>
        </div>

        {/* Hero slider */}
        <div className="mt-4 sm:mt-6 animate-hero-in" style={{ animationDelay: '100ms' }}>
          <div className="relative rounded-2xl overflow-hidden h-40 sm:h-52 lg:h-64 shadow-z">
            <div key={index} className="relative w-full h-full">
              <Image
                src={slides[index].img}
                alt="Dilip Da specials"
                fill
                loading="eager"
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 1200px"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-8">
                <p className="text-white text-[10px] font-bold tracking-[0.2em] uppercase">{slides[index].top}</p>
                <p className="mt-1 text-2xl sm:text-4xl font-extrabold text-white leading-tight">{slides[index].bottom}</p>
                <p className="mt-1 text-xs text-white/85">{slides[index].note}</p>
                <Link
                  href="/menu"
                  className="mt-3 w-fit h-9 sm:h-10 px-5 inline-flex items-center justify-center gap-2 rounded-full bg-white text-zred text-xs sm:text-sm font-bold shadow-md transition-transform hover:-translate-y-0.5"
                >
                  Order now <span className="text-sm">›</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="slider-dots">
            {slides.map((s, i) => (
              <button
                key={s.top}
                onClick={() => setIndex(i)}
                className={`slider-dot ${i === index ? 'active' : ''}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
