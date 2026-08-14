'use client';

import { useEffect, useState } from 'react';
import { getPublicSettings, type PublicStoreSettings } from '@/features/settings/actions';

const FALLBACK: PublicStoreSettings = {
  activeGateway: 'razorpay',
  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
  gpayUpiId: process.env.NEXT_PUBLIC_STORE_UPI_ID ?? '',
  gpayUpiName: process.env.NEXT_PUBLIC_STORE_UPI_NAME ?? 'Dilip Da',
  supportPhone: '',
  supportEmail: '',
  address: '',
  whatsapp: '',
  instagram: '',
  facebook: '',
  website: '',
  storeUpiId: process.env.NEXT_PUBLIC_STORE_UPI_ID ?? '',
  storeUpiName: process.env.NEXT_PUBLIC_STORE_UPI_NAME ?? 'Dilip Da',
  hours: { open: '10:00', close: '21:30' },
  orderByCutoffs: [
    { label: 'lunch', time: '10:45' },
    { label: 'dinner', time: '18:45' },
  ],
  deliveryLocations: ['SNM, CIT Kokrajhar'],
  deliveryFee: 10,
  taxPercentage: 5,
  cancellationWindowMinutes: 2,
};

export function usePublicSettings(): PublicStoreSettings {
  const [settings, setSettings] = useState<PublicStoreSettings>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    getPublicSettings().then((s) => {
      if (!cancelled) setSettings(s);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return settings;
}