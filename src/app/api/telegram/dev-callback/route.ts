import { NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/service';
import { sendTelegramMessage } from '@/lib/telegram';

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const orderId = searchParams.get('orderId');

  if (!action || !orderId) {
    return NextResponse.json({ error: 'Missing action or orderId' }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
  const db = supabase;

  async function transitionThrough(statuses: string[]): Promise<boolean> {
    for (const status of statuses) {
      const { data: current } = await db
        .from('orders')
        .select('status, status_history')
        .eq('id', orderId)
        .single();
      if (!current) return false;

      const ts = new Date().toISOString();
      const historyEntry = { status, timestamp: ts, note: null };
      const existingHistory = (current.status_history ?? []) as Array<Record<string, unknown>>;
      const timestamps: Record<string, string> = {};
      if (status === 'accepted') timestamps.accepted_at = ts;
      if (status === 'preparing') timestamps.prepared_at = ts;
      if (status === 'cancelled' || status === 'declined') timestamps.cancelled_at = ts;

      const { error } = await db
        .from('orders')
        .update({
          status,
          status_history: [...existingHistory, historyEntry],
          ...timestamps,
        })
        .eq('id', orderId);
      if (error) return false;
    }
    return true;
  }

  const { data: order } = await db
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  let success = false;
  let label = '';

  if (action === 'accept') {
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Order is no longer pending' });
    }
    success = await transitionThrough(['accepted']);
    label = '✅ Accepted';
  } else if (action === 'reject') {
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Order is no longer pending' });
    }
    success = await transitionThrough(['declined']);
    label = '❌ Rejected';
  } else if (action === 'out_for_delivery') {
    if (order.status !== 'accepted') {
      return NextResponse.json({ error: 'Order must be accepted first' });
    }
    success = await transitionThrough(['preparing', 'ready', 'out_for_delivery']);
    label = '🚚 Out for Delivery';
  }

  if (!success) {
    return NextResponse.json({ error: 'Failed to update order' });
  }

  await sendTelegramMessage(
    `<b>Dev Test:</b> Order <code>${orderId}</code> → ${label}`
  );

  return NextResponse.json({ success: true, action, orderId, status: label });
}
