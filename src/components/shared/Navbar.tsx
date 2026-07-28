'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRound, Home, UtensilsCrossed, ClipboardList, Heart, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/shared/ThemeToggle';

const navLinks = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Menu', href: '/menu', icon: UtensilsCrossed },
  { label: 'Orders', href: '/orders', icon: ClipboardList },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <header className="nav-z relative z-50">
      <div className="container-z mx-auto nav-inner px-3 sm:px-4">
        {/* Logo or Back button */}
        {pathname === '/favorites' ? (
          <button onClick={() => router.back()} className="flex items-center gap-1 text-ztext hover:text-zred transition-colors shrink-0 font-semibold" aria-label="Go back">
            <ChevronLeft size={20} /> Back
          </button>
        ) : (
          <Link href="/" className="flex items-center gap-1.5 shrink-0" aria-label="Dilip Da">
            <span className="text-xl sm:text-2xl font-semibold tracking-tight">
              <span className="text-ztext">Dilip</span> <span className="text-zred">Da</span>
            </span>
          </Link>
        )}

        {/* Desktop nav links */}
        <nav className="hidden sm:flex items-center gap-1 ml-auto" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`button-z button-z-ghost text-sm font-medium transition-colors ${
                isActive(link.href) ? '!text-white font-bold' : ''
              }`}
              aria-current={isActive(link.href) ? 'page' : undefined}
            >
              <link.icon size={14} className="mr-1" />
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right icons */}
        <div className="hidden sm:flex items-center gap-1">
          <ThemeToggle className="icon-button-z" />
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-zgray animate-pulse" />
          ) : isAuthenticated ? (
            <Link href="/profile" className="icon-button-z" aria-label="Profile">
              <UserRound size={18} />
            </Link>
          ) : (
            <Link href="/auth/login" className="button-z button-z-primary text-sm px-4">
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile: logo + theme + favorites (bottom nav handles navigation) */}
        <div className="flex items-center gap-1 sm:hidden ml-auto">
          <ThemeToggle className="icon-button-z" />
          <Link href="/favorites" className="icon-button-z text-zred" aria-label="Favorites">
            <Heart size={20} className="fill-zred/20" />
          </Link>
        </div>
      </div>
    </header>
  );
}
