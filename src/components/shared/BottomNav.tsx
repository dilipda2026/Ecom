'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, ClipboardList, User } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store';
import { getUserOrders } from '@/features/orders/actions/customer';
import { isActiveOrder } from '@/features/orders/types';

const tabs = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Menu', href: '/menu', icon: UtensilsCrossed },
  { label: 'Orders', href: '/orders', icon: ClipboardList },
  { label: 'Profile', href: '/profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const [activeOrderCount, setActiveOrderCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    getUserOrders(1, 10).then((res) => {
      if (!cancelled && res.success && res.data) {
        setActiveOrderCount(res.data.orders.filter((o) => isActiveOrder(o.status)).length);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const badgeCount = isAuthenticated ? activeOrderCount : 0;

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard')) return null;
  if (user?.role === 'delivery') return null;

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        const Icon = tab.icon;
        const href =
          tab.label === 'Profile' && !isAuthenticated
            ? '/auth/login'
            : tab.href;

        return (
          <Link
            key={tab.label}
            href={href}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="relative">
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {tab.label === 'Orders' && badgeCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-0.5 rounded-full bg-zred text-white text-[9px] font-bold flex items-center justify-center">
                  {badgeCount}
                </span>
              )}
            </span>
            <span>{tab.label === 'Profile' && !isAuthenticated ? 'Sign In' : tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
