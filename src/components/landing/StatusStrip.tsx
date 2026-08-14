'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { isStoreOpen, nextOrderByCutoff, formatClock } from '@/features/menu/lib/store-hours';

export default function StatusStrip() {
  const [now, setNow] = useState<Date | null>(null);
  const settings = usePublicSettings();

  useEffect(() => {
    const first = window.setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  const hours = { open: settings.hours.open, close: settings.hours.close };
  const open = now ? isStoreOpen(hours, now) : false;
  const cutoff = now && open ? nextOrderByCutoff(settings.orderByCutoffs, now) : null;

  return (
    <div className="bg-zbg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-1">
        <div className="flex items-center gap-2.5 rounded-2xl border border-zborder bg-zcard px-4 py-2.5 shadow-sm animate-fade-up">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${now ? (open ? 'bg-zgreen' : 'bg-amber-500') : 'bg-zgray'}`} />
          <p className="text-xs font-semibold text-ztext truncate">
            {now
              ? (open ? `Open now · Kitchen closes ${formatClock(hours.close)}` : `Closed now · Opens tomorrow ${formatClock(hours.open)}`)
              : ''}
          </p>
          {cutoff && (
            <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/25 rounded-full px-2.5 py-1">
              <Clock size={10} />
              {cutoff.minutesLeft <= 15
                ? `${cutoff.label} orders close in ${cutoff.minutesLeft}m`
                : `Order by ${formatClock(cutoff.time)} for ${cutoff.label}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
