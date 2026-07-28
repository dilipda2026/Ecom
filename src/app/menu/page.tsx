import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { Metadata } from 'next';

const MenuItems = dynamic(() => import('../(menu)/MenuItems').then((m) => ({ default: m.MenuItems })));

export const metadata: Metadata = { title: 'Menu' };

const sections = [
  {
    category: 'Thali',
    items: [
      { id: 'thali-chicken', name: 'Chicken Thali', price: 70, desc: 'Complete thali with rice, dal, sabzi & chicken curry', veg: false, popular: true, img: '/images/Chicken Curry.jpg' },
      { id: 'thali-pork', name: 'Pork Thali', price: 70, desc: 'Complete thali with rice, dal, sabzi & pork curry', veg: false, popular: true, img: '/images/Pork Thali.webp' },
      { id: 'thali-veg', name: 'Veg Thali', price: 60, desc: 'Complete thali with rice, dal, sabzi & papad', veg: true, popular: true, img: '/images/Aloo Posto.jpg' },
    ],
  },
  {
    category: 'Gravy',
    items: [
      { id: 'gravy-chicken', name: 'Chicken (5 pcs) Gravy', price: 40, desc: '5 pieces of chicken in rich gravy', veg: false, popular: false, img: '/images/Chicken (5 pcs) Gravy.webp' },
      { id: 'gravy-pork', name: 'Pork (5 pcs) Gravy', price: 40, desc: '5 pieces of pork in rich gravy', veg: false, popular: false, img: '/images/Pork(5 pcs) Gravy.jpg' },
    ],
  },
];

/*
 * Previous menu items — preserved for future use
 *
const sectionsOld = [
  {
    category: 'Biryani & Rice',
    items: [
      { id: 'biryani-1', name: 'Kolkata Biryani', price: 280, desc: 'Fragrant basmati rice with tender chicken, potato & egg', veg: false, popular: true, img: '/images/Kolkata_biryani.jpg' },
      { id: 'biryani-2', name: 'Mutton Biryani', price: 350, desc: 'Slow-cooked mutton biryani with aromatic spices', veg: false, popular: true, img: '/images/Mutton Biryani.webp' },
      { id: 'biryani-3', name: 'Vegetable Biryani', price: 220, desc: 'Mixed vegetable biryani with saffron & ghee', veg: true, popular: false, img: '/images/Vegetable Biryani.jpg' },
      { id: 'rice-1', name: 'Daal & Rice', price: 160, desc: 'Comforting dal chawal with ghee & papad', veg: true, popular: false, img: '/images/Daal-and-Rice.jpg' },
    ],
  },
  {
    category: 'Fish & Seafood',
    items: [
      { id: 'fish-1', name: 'Macher Jhol', price: 220, desc: 'Traditional fish curry with turmeric & ginger', veg: false, popular: true, img: '/images/Macher-Jhol.webp' },
      { id: 'fish-2', name: 'Shorshe Ilish', price: 350, desc: 'Hilsa fish in mustard gravy — a local classic', veg: false, popular: true, img: '/images/Shorshe Ilish.jpg' },
      { id: 'fish-3', name: 'Fish Fry', price: 180, desc: 'Crispy fried fish fillet with salad & sauce', veg: false, popular: false, img: '/images/Macher-Jhol.webp' },
      { id: 'fish-4', name: 'Prawn Malai Curry', price: 320, desc: 'Rich coconut milk based prawn curry', veg: false, popular: false, img: '/images/Prawn Malai Curry.jpg' },
    ],
  },
  {
    category: 'Meat & Poultry',
    items: [
      { id: 'meat-1', name: 'Mutton Kosha', price: 320, desc: 'Slow-cooked mutton in thick spicy gravy', veg: false, popular: true, img: '/images/Mutton Kosha.jpg' },
      { id: 'meat-2', name: 'Chicken Rezala', price: 250, desc: 'Creamy white chicken gravy with cashew paste', veg: false, popular: false, img: '/images/Chicken Rezala.jpg' },
      { id: 'meat-3', name: 'Chicken Curry', price: 220, desc: 'Homestyle chicken curry with potatoes', veg: false, popular: false, img: '/images/Chicken Curry.jpg' },
      { id: 'meat-4', name: 'Keema Paratha', price: 180, desc: 'Stuffed minced meat paratha served with yogurt', veg: false, popular: false, img: '/images/Keema Paratha.jpg' },
    ],
  },
  {
    category: 'Vegetarian',
    items: [
      { id: 'veg-1', name: 'Shukto', price: 140, desc: 'Traditional mixed vegetable bitter preparation', veg: true, popular: false, img: '/images/Shukto.webp' },
      { id: 'veg-2', name: 'Aloo Posto', price: 130, desc: 'Potatoes cooked in poppy seed paste', veg: true, popular: false, img: '/images/Aloo Posto.jpg' },
      { id: 'veg-3', name: 'Chholar Dal', price: 120, desc: 'Homestyle chana dal with coconut & ghee', veg: true, popular: false, img: '/images/Chholar Dal.jpg' },
      { id: 'veg-4', name: 'Paneer Butter Masala', price: 240, desc: 'Rich creamy paneer curry with butter', veg: true, popular: true, img: '/images/Paneer Butter Masala.jpg' },
    ],
  },
  {
    category: 'Sweets',
    items: [
      { id: 'sweet-1', name: 'Misti Doi', price: 80, desc: 'Traditional sweet yogurt', veg: true, popular: true, img: '/images/Misti Doi.jpg' },
      { id: 'sweet-2', name: 'Rosogolla', price: 70, desc: 'Soft spongy cottage cheese balls in sugar syrup', veg: true, popular: false, img: '/images/Rosogolla.jpg' },
      { id: 'sweet-3', name: 'Sandesh', price: 90, desc: 'Traditional sweet made from fresh paneer', veg: true, popular: false, img: '/images/Sandesh.jpg' },
    ],
  },
];
*/

export default function MenuPage() {
  return (
    <div className="page-pad">
      <div className="container-z mx-auto max-w-5xl">
        {/* Added a beautiful header image for the menu page */}
        <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden mb-6 mt-2 shadow-z border border-zborder">
          <Image
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=600&fit=crop"
            alt="Delicious fresh food spread"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-5 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">Our Menu</h1>
            <p className="text-sm text-white/80 mt-1 max-w-md">Explore our complete range of culinary delights prepared fresh daily.</p>
          </div>
        </div>
        
        <MenuItems sections={sections} />
      </div>
    </div>
  );
}
