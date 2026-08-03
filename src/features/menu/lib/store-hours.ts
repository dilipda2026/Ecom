export interface StoreHours {
  open: string;
  close: string;
}

export interface OrderByCutoff {
  label: string;
  time: string;
}

export function minutesOf(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function isStoreOpen(hours: StoreHours, now: Date): boolean {
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= minutesOf(hours.open) && mins < minutesOf(hours.close);
}

export function nextOrderByCutoff(slots: OrderByCutoff[], now: Date): OrderByCutoff & { minutesLeft: number } | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  let best: (OrderByCutoff & { minutesLeft: number }) | null = null;
  for (const s of slots) {
    const t = minutesOf(s.time);
    if (t > mins && (best === null || t - mins < best.minutesLeft)) {
      best = { label: s.label, time: s.time, minutesLeft: t - mins };
    }
  }
  return best;
}

export function formatClock(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
