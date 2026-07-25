'use server';

import { env } from '@/config/env';

export async function createRazorpayOrder(amount: number, currency = 'INR'): Promise<
  { success: true; data: { id: string; amount: number; currency: string } } | { success: false; error: string }
> {
  if (!env.razorpay.isConfigured) {
    return { success: false, error: 'Razorpay not configured' };
  }

  const auth = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');

  try {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        currency,
        receipt: `receipt_${Date.now()}`,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error?.description || 'Failed to create Razorpay order' };
    }

    const order = await res.json();
    return { success: true, data: { id: order.id, amount: order.amount, currency: order.currency } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create Razorpay order' };
  }
}
