export interface MenuItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  veg: boolean;
  popular: boolean;
  img: string;
}

export interface MenuSection {
  category: string;
  items: MenuItem[];
}

export const menuSections: MenuSection[] = [
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
