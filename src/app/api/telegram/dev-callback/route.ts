import { NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/service';
import { sendTelegramMessage } from '@/lib/telegram';

const STATUS_LABELS: Record<string, string> = {
  accepted: '✅ Accepted',
  declined: '❌ Rejected',
  preparing: '👨‍🍳 Preparing',
  ready: '🍽️ Ready',
  out_for_delivery: '🚚 Out for Delivery',
  delivered: '📦 Delivered',
  completed: '✅ Completed',
  cancelled: '❌ Cancelled',
};

const VALID_STATUSES = ['accepted', 'declined', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];

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

  if (!VALID_STATUSES.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Valid: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('status, status_history')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const ts = new Date().toISOString();
  const historyEntry = { status: action, timestamp: ts, note: 'Dev test' };
  const existingHistory = (order.status_history ?? []) as Array<Record<string, unknown>>;
  const timestamps: Record<string, string> = {};
  if (action === 'accepted') timestamps.accepted_at = ts;
  if (action === 'preparing') timestamps.prepared_at = ts;
  if (action === 'delivered') timestamps.delivered_at = ts;
  if (action === 'cancelled' || action === 'declined') timestamps.cancelled_at = ts;

  const { error } = await supabase
    .from('orders')
    .update({
      status: action,
      status_history: [...existingHistory, historyEntry],
      ...timestamps,
    })
    .eq('id', orderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const label = STATUS_LABELS[action] ?? action;
  await sendTelegramMessage(`<b>Dev Test:</b> Order <code>${orderId}</code> → ${label}`);

  return NextResponse.json({ success: true, action, orderId, status: label });
}
