export const STORE_CONFIG = {
  upiId: process.env.NEXT_PUBLIC_STORE_UPI_ID ?? '',
  upiName: process.env.NEXT_PUBLIC_STORE_UPI_NAME ?? 'Dilip Da',
  hours: { open: '10:00', close: '21:30' },
  orderByCutoffs: [
    { label: 'lunch', time: '10:45' },
    { label: 'dinner', time: '18:45' },
  ],
};
