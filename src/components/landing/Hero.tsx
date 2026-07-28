'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin } from 'lucide-react';

export default function Hero() {
  return (
    <section className="bg-zbg">
      {/* Compact header with branding + status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-ztext tracking-tight">
              Order your <span className="text-zred">favorites</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <MapPin size={12} className="text-ztext-lighter" />
              <p className="text-xs text-ztext-light">Freshly cooked at CIT Kokrajhar, 2nd Gate</p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <Link
          href="/menu"
          className="mt-4 flex items-center gap-2.5 bg-zcard border border-zborder rounded-xl px-3.5 py-2.5 hover:border-ztext-lighter transition-colors"
        >
          <Search size={16} className="text-ztext-muted shrink-0" />
          <span className="text-sm text-ztext-muted">Search for dishes...</span>
        </Link>
      </div>

      {/* Compact hero banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2">
        <div className="relative rounded-2xl overflow-hidden h-36 sm:h-48 lg:h-56">
          <Image
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=600&fit=crop"
            alt="Delicious homestyle food spread"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-8">
            <p className="text-white font-bold text-sm sm:text-lg lg:text-xl max-w-xs sm:max-w-sm">
              Delicious homestyle meals,
              <br />
              <span className="text-white/80 font-normal text-xs sm:text-sm">
                made fresh with love every day
              </span>
            </p>
            <Link
              href="/menu"
              className="mt-3 button-z button-z-primary w-fit text-xs sm:text-sm px-5 h-9 sm:h-10"
            >
              Order now
            </Link>
          </div>
        </div>
      </div>


    </section>
  );
}
