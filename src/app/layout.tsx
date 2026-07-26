import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Providers } from '@/providers';
import Footer from '@/components/shared/Footer';
import './globals.css';

const NavbarWrapper = dynamic(() => import('@/components/shared/NavbarWrapper'));
const BottomNav = dynamic(() => import('@/components/shared/BottomNav'));
const Toast = dynamic(() => import('@/components/shared/Toast'));
const FloatingCart = dynamic(() => import('@/components/shared/FloatingCart'));
const FlyingBird = dynamic(() => import('@/components/shared/FlyingBird'));

export const metadata: Metadata = {
  title: {
    template: '%s | Dilip Da',
    default: 'Dilip Da — Homestyle Bengali Meals near CIT Kokrajhar',
  },
  description: 'Dilip Da is a homestyle Bengali food service run by Dilip da, serving fresh meals near CIT Kokrajhar. Order online for delivery.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light-mode')})();document.querySelectorAll('[fdprocessedid]').forEach(function(e){e.removeAttribute('fdprocessedid')})` }} />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://videos.pexels.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://videos.pexels.com" />
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <link
          rel="preload"
          as="image"
          href="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=600&fit=crop"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-screen bg-zbg font-sans antialiased">
        <Providers>
          <NavbarWrapper />
          <main className="min-h-[calc(100vh-4rem)] has-bottom-nav">{children}</main>
          <Footer />
          <FloatingCart />
          <FlyingBird />
          <BottomNav />
          <Toast />
        </Providers>
      </body>
    </html>
  );
}
