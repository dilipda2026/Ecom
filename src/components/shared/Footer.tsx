'use client';

import { MapPin, Phone } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer className="bg-zgray border-t border-zborder py-6 pb-20 sm:pb-6">
      <div className="container-z mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-black text-ztext text-sm">
              Dilip<span className="text-zred"> Da</span>
            </span>
            <span className="text-xs text-ztext-light">&mdash; Order food. Pay fair.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-ztext-light">
            <span className="flex items-center gap-1">
              <MapPin size={11} /> Near CIT Kokrajhar
            </span>
            <span className="flex items-center gap-1">
              <Phone size={11} /> 6000212823
            </span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
