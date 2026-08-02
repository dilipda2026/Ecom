import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { Metadata } from 'next';
import { menuSections } from '@/features/menu/data';

const MenuItems = dynamic(() => import('../(menu)/MenuItems').then((m) => ({ default: m.MenuItems })));

export const metadata: Metadata = { title: 'Menu' };

export default function MenuPage() {
  return (
    <div className="page-pad">
      <div className="container-z mx-auto max-w-5xl">
        {/* Added a beautiful header image for the menu page */}
        <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden mb-6 mt-2 shadow-z border border-zborder">
          <Image
            src="/images/Chicken Curry.jpg"
            alt="Delicious fresh food spread"
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-5 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">Our Menu</h1>
            <p className="text-sm text-white/80 mt-1 max-w-md">Explore our complete range of culinary delights prepared fresh daily.</p>
          </div>
        </div>

        <MenuItems sections={menuSections} />
      </div>
    </div>
  );
}
