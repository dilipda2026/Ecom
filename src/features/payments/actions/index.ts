'use server';

import { env } from '@/config/env';
import { getSetting } from '@/lib/settings';

export async function createRazorpayOrder(amount: number, currency = 'INR'): Promise<
  { success: true; data: { id: string; amount: number; currency: string } } | { success: false; error: string }
> {
  const keyId = (await getSetting('razorpay_key_id')) || env.razorpay.keyId || '';
  const storedSecret = await getSetting('razorpay_key_secret');
  const keySecret = storedSecret || env.razorpay.keySecret || '';

  if (!keyId || !keySecret) {
    return { success: false, error: 'Razorpay not configured' };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

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
      if (res.status === 401 || res.status === 403) {
        return { success: false, error: 'Razorpay authentication failed — check that your Razorpay API key and secret are correct' };
      }
      return { success: false, error: err.error?.description || 'Failed to create Razorpay order' };
    }

    const order = await res.json();
    return { success: true, data: { id: order.id, amount: order.amount, currency: order.currency } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create Razorpay order' };
  }
}

export async function verifyRazorpayPayment(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<{ success: boolean; error?: string }> {
  if (!paymentId) {
    return { success: false, error: 'Missing Razorpay payment ID' };
  }

  const secret = env.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    // Development fallback if key secret not provided
    return { success: true };
  }

  try {
    if (orderId && signature) {
      const crypto = await import('crypto');
      const text = `${orderId}|${paymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(text)
        .digest('hex');

      if (generatedSignature === signature) {
        return { success: true };
      }
    }

    // Secondary verification via Razorpay API GET /v1/payments/{id}
    const keyId = env.razorpay.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (keyId && secret) {
      const auth = Buffer.from(`${keyId}:${secret}`).toString('base64');
      const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (res.ok) {
        const paymentData = await res.json();
        if (['captured', 'authorized'].includes(paymentData.status)) {
          return { success: true };
        }
      }
    }

    return { success: false, error: 'Invalid Razorpay payment signature' };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Razorpay verification error' };
  }
}

