'use client';

import { useMemo, useState } from 'react';
import Hero from '@/components/landing/Hero';
import OfferCards from '@/components/landing/OfferCards';
import FeaturedDishes from '@/components/landing/FeaturedDishes';
import { menuSections } from '@/features/menu/data';

export default function HomeMenu() {
  const [query, setQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [priceCap, setPriceCap] = useState<number | null>(null);
  const [popularOnly, setPopularOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuSections
      .filter((s) => activeCategory === 'All' || s.category === activeCategory)
      .flatMap((s) => s.items)
      .filter((i) => {
        if (vegOnly && !i.veg) return false;
        if (priceCap && i.price > priceCap) return false;
        if (popularOnly && !i.popular) return false;
        if (q && !i.name.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [query, vegOnly, activeCategory, priceCap, popularOnly]);

  function clearFilters() {
    setQuery('');
    setVegOnly(false);
    setActiveCategory('All');
    setPriceCap(null);
    setPopularOnly(false);
  }

  return (
    <>
      <Hero
        query={query}
        onQueryChange={setQuery}
        vegOn={vegOnly}
        onVegToggle={() => setVegOnly((v) => !v)}
      />
      <OfferCards active={activeCategory} onSelect={setActiveCategory} />
      <FeaturedDishes
        dishes={filtered}
        vegOnly={vegOnly}
        onVegOnly={setVegOnly}
        priceCap={priceCap}
        onPriceCap={setPriceCap}
        popularOnly={popularOnly}
        onPopularOnly={setPopularOnly}
        onClear={clearFilters}
      />
    </>
  );
}
