'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

const IMAGE_DURATION_MS = 5000;

interface SliderItem {
  type: 'image' | 'video';
  url: string;
  alt?: string;
}

/**
 * Home screen bumper offers slider.
 * - Images auto-advance after IMAGE_DURATION_MS.
 * - Videos play fully (muted, autoplay) before advancing via the "ended" event.
 * - Only one video is mounted at a time; other media stay unmounted/lazy.
 * - Restarts from the first item after the last one.
 * - A single healthy item renders statically without any timer.
 * - Failed/invalid media is removed from rotation gracefully.
 */
export default function BumperOffersSlider({ items }: { items: SliderItem[] }) {
  const [index, setIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(new Set());

  const valid = useMemo(
    () => items.filter((i) => !!i.url && !failedUrls.has(i.url)),
    [items, failedUrls],
  );

  // Derived (not synced) so shrinking the list never leaves an out-of-range index.
  const safeIndex = valid.length > 0 ? Math.min(index, valid.length - 1) : 0;
  const current = valid[safeIndex];

  const markFailed = useCallback((url: string) => {
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => (valid.length > 0 ? (i + 1) % valid.length : 0));
  }, [valid.length]);

  // Auto-advance images only; videos advance via their own "ended" event.
  useEffect(() => {
    if (!current || current.type !== 'image' || valid.length < 2) return;
    const id = setTimeout(goNext, IMAGE_DURATION_MS);
    return () => clearTimeout(id);
  }, [current, safeIndex, valid.length, goNext]);

  if (valid.length === 0) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden h-32 sm:h-44 lg:h-56 shadow-z bg-zgray">
      {current.type === 'image' ? (
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt ?? 'Dilip Da offer'}
          fill
          loading={safeIndex === 0 ? 'eager' : 'lazy'}
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 1200px"
          onError={() => markFailed(current.url)}
        />
      ) : (
        <video
          key={current.url}
          src={current.url}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          preload="auto"
          onError={() => markFailed(current.url)}
          onEnded={goNext}
        />
      )}

      {valid.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
          {valid.map((item, i) => (
            <button
              key={`${item.url}-${i}`}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`slider-dot ${i === safeIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
