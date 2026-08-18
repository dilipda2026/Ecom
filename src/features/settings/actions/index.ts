'use server';

import { getSetting, getNumericSetting, getJsonSetting, getDeliveryEmails, getAdminEmails, getOwnerEmail, getStoreIsOpen } from '@/lib/settings';

export interface PublicStoreSettings {
  razorpayKeyId: string;
  gpayUpiId: string;
  gpayUpiName: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  website: string;
  storeUpiId: string;
  storeUpiName: string;
  hours: { open: string; close: string };
  orderByCutoffs: { label: string; time: string }[];
  deliveryLocations: string[];
  deliveryFee: number;
  maintenanceFee: number;
  cancellationWindowMinutes: number;
  deliveryEmails: string[];
  adminEmails: string[];
  ownerEmail: string;
  walletEnabled: boolean;
  walletCreditLimit: number;
  isOpen: boolean;
}

export async function getPublicSettings(): Promise<PublicStoreSettings> {
  return {
    razorpayKeyId: (await getSetting('razorpay_key_id')) || '',
    gpayUpiId: (await getSetting('gpay_upi_id')) || '',
    gpayUpiName: (await getSetting('gpay_upi_name')) || '',
    supportPhone: (await getSetting('store_support_phone')) || '',
    supportEmail: (await getSetting('store_support_email')) || '',
    address: (await getSetting('store_address')) || '',
    whatsapp: (await getSetting('store_whatsapp')) || '',
    instagram: (await getSetting('store_instagram')) || '',
    facebook: (await getSetting('store_facebook')) || '',
    website: (await getSetting('store_website')) || '',
    storeUpiId: (await getSetting('store_upi_id')) || '',
    storeUpiName: (await getSetting('store_upi_name')) || '',
    hours: {
      open: (await getSetting('store_hours_open')) || '10:00',
      close: (await getSetting('store_hours_close')) || '21:30',
    },
    orderByCutoffs: [
      { label: 'lunch', time: (await getSetting('store_order_cutoff_lunch')) || '10:45' },
      { label: 'dinner', time: (await getSetting('store_order_cutoff_dinner')) || '18:45' },
    ],
    deliveryLocations: await getJsonSetting<string[]>('store_delivery_locations', [
      'SNM, CIT Kokrajhar',
      'SJ, CIT Kokrajhar',
      'JD, CIT Kokrajhar',
      'Staff Quarter, CIT Kokrajhar',
      'Gambari Girls Hostel, CIT Kokrajhar',
      'Mtech Quarter, CIT Kokrajhar',
    ]),
    deliveryFee: await getNumericSetting('delivery_fee', 10),
    maintenanceFee: await getNumericSetting('maintenance_fee', 1),
    cancellationWindowMinutes: await getNumericSetting('cancellation_window_minutes', 2),
    deliveryEmails: await getDeliveryEmails(),
    adminEmails: await getAdminEmails(),
    ownerEmail: (await getOwnerEmail()) ?? '',
    walletEnabled: (await getSetting('payment_method_wallet_enabled')) === 'true',
    walletCreditLimit: await getNumericSetting('wallet_credit_limit', 500),
    isOpen: (await getStoreIsOpen()) ?? true,
  };
}