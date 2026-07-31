'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useFavoritesStore, FavoriteItem } from '@/features/favorites/store';

interface FavoriteButtonProps {
  item: FavoriteItem;
  className?: string;
}

export default function FavoriteButton({ item, className = '' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const [animate, setAnimate] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const favorited = mounted ? isFavorite(item.id) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(item);
    
    // Trigger animation only when adding to favorites
    if (!favorited) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 300);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-zborder z-10 transition-colors focus:outline-none ${className} ${animate ? 'animate-heart-pop' : ''}`}
      aria-label={favorited ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
    >
      <Heart
        size={14}
        className={`transition-colors duration-200 ${
          favorited ? 'fill-zred text-zred' : 'text-ztext-muted hover:text-ztext'
        }`}
      />
    </button>
  );
}
