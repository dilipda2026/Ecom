'use client';

import { useMemo, useState } from 'react';
import Hero from '@/components/landing/Hero';
import StatusStrip from '@/components/landing/StatusStrip';
import OfferCards from '@/components/landing/OfferCards';
import FavoritesShelf from '@/components/landing/FavoritesShelf';
import FeaturedDishes from '@/components/landing/FeaturedDishes';
import FloatingCartBar from '@/components/landing/FloatingCartBar';
import Reveal from '@/components/shared/Reveal';
import HomeHeader from '@/features/home/components/HomeHeader';
import SpecialsShelf from '@/features/home/components/SpecialsShelf';
import RecentOrders from '@/features/home/components/RecentOrders';
import { useHomeOrders } from '@/features/home/lib/useHomeOrders';
import { isActiveOrder, isCompletedOrder } from '@/features/orders/types';
import { useAuthStore } from '@/features/auth/store';
import { useMenu } from '@/features/menu/hooks/useMenu';

export default function HomeMenu() {
  const [query, setQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [priceCap, setPriceCap] = useState<number | null>(null);
  const [popularOnly, setPopularOnly] = useState(false);

  const { sections } = useMenu();
  const { user, isAuthenticated } = useAuthStore();
  const { orders } = useHomeOrders();
  const visibleOrders = useMemo(() => (isAuthenticated ? (orders ?? []) : []), [isAuthenticated, orders]);
  const liveOrder = visibleOrders.find((o) => isActiveOrder(o.status)) ?? null;
  const recentDelivered = visibleOrders.filter((o) => isCompletedOrder(o.status)).slice(0, 5);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections
      .filter((s) => activeCategory === 'All' || s.category === activeCategory)
      .flatMap((s) => s.items)
      .filter((i) => {
        if (vegOnly && !i.veg) return false;
        if (priceCap && i.price > priceCap) return false;
        if (popularOnly && !i.popular) return false;
        if (q && !i.name.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [sections, query, vegOnly, activeCategory, priceCap, popularOnly]);

  function clearFilters() {
    setQuery('');
    setVegOnly(false);
    setActiveCategory('All');
    setPriceCap(null);
    setPopularOnly(false);
  }

  return (
    <>
      <HomeHeader user={user} liveOrder={liveOrder} />
      <Hero
        query={query}
        onQueryChange={setQuery}
        vegOn={vegOnly}
        onVegToggle={() => setVegOnly((v) => !v)}
      />
      <StatusStrip />
      <Reveal>
        <SpecialsShelf />
      </Reveal>
      <Reveal>
        <OfferCards active={activeCategory} onSelect={setActiveCategory} />
      </Reveal>
      <Reveal>
        <RecentOrders orders={recentDelivered} />
      </Reveal>
      <Reveal>
        <FavoritesShelf />
      </Reveal>
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
      <FloatingCartBar />
    </>
  );
}
