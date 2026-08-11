'use client';

import { useEffect, useState } from 'react';
import { menuSections as fallbackSections, type MenuSection } from '../data';

export function useMenu() {
  const [sections, setSections] = useState<MenuSection[]>(fallbackSections);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'db' | 'fallback'>('fallback');

  useEffect(() => {
    let active = true;

    async function fetchMenu() {
      try {
        const res = await fetch('/api/menu');
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && data.sections && data.sections.length > 0) {
            setSections(data.sections);
            setSource(data.source);
          }
        }
      } catch (err) {
        console.error('Error fetching dynamic menu:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchMenu();

    return () => {
      active = false;
    };
  }, []);

  const allItems = sections.flatMap((s) => s.items);

  return { sections, allItems, loading, source };
}
