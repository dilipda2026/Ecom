'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import { useAuthStore } from '@/features/auth/store';

export default function NavbarWrapper() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard')) return null;
  if (user?.role === 'delivery') return null;
  return <Navbar />;
}
