import { NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/service';
import { editTelegramMessage, answerCallbackQuery } from '@/lib/telegram';
import { getStatusButtons } from '@/lib/notifications';

const STATUS_BADGE: Record<string, string> = {
  pending: '⏳ Pending',
  accepted: '✅ Accepted',
  declined: '❌ Rejected',
  preparing: '👨‍🍳 Preparing',
  ready: '🍽️ Ready',
  assigned: '🛵 Assigned',
  out_for_delivery: '🚚 Out for Delivery',
  delivered: '📦 Delivered',
  completed: '✅ Completed',
  cancelled: '❌ Cancelled',
};

async function updateOrderStatus(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  orderId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const { data: current } = await supabase
    .from('orders')
    .select('status, status_history, prepared_at')
    .eq('id', orderId)
    .single();

  if (!current) return { success: false, error: 'Order not found' };

  const ts = new Date().toISOString();
  const historyEntry = { status: newStatus, timestamp: ts, note: 'Telegram update' };
  const existingHistory = (current.status_history ?? []) as Array<Record<string, unknown>>;
  const timestamps: Record<string, string> = {};
  if (newStatus === 'accepted') timestamps.accepted_at = ts;
  if (newStatus === 'preparing') timestamps.prepared_at = ts;
  if (newStatus === 'ready') timestamps.prepared_at = current.prepared_at ?? ts;
  if (newStatus === 'delivered') timestamps.delivered_at = ts;
  if (newStatus === 'cancelled' || newStatus === 'declined') timestamps.cancelled_at = ts;

  const { error } = await supabase
    .from('orders')
    .update({
      status: newStatus,
      status_history: [...existingHistory, historyEntry],
      ...timestamps,
    })
    .eq('id', orderId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.callback_query) {
      return NextResponse.json({ ok: true });
    }

    const { id: callbackId, from, data, message } = body.callback_query;

    const authorizedChatId = process.env.TELEGRAM_CHAT_ID;
    if (!authorizedChatId || String(from.id) !== authorizedChatId) {
      await answerCallbackQuery(callbackId, 'Unauthorized');
      return NextResponse.json({ ok: false, error: 'Unauthorized' });
    }

    if (!data || !data.includes(':')) {
      await answerCallbackQuery(callbackId, 'Invalid action');
      return NextResponse.json({ ok: false, error: 'Invalid action' });
    }

    const [newStatus, orderId] = data.split(':') as [string, string];
    const chatId = message.chat.id;
    const msgId = message.message_id;

    const validStatuses = ['accepted', 'declined', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      await answerCallbackQuery(callbackId, 'Invalid status');
      return NextResponse.json({ ok: false, error: 'Invalid status' });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      await answerCallbackQuery(callbackId, 'Service unavailable');
      return NextResponse.json({ ok: false, error: 'Service unavailable' });
    }

    const { data: orderData } = await supabase
      .from('orders')
      .select('status, tracking_code')
      .eq('id', orderId)
      .single();

    if (!orderData) {
      await answerCallbackQuery(callbackId, 'Order not found');
      return NextResponse.json({ ok: false, error: 'Order not found' });
    }

    const result = await updateOrderStatus(supabase, orderId, newStatus);
    if (!result.success) {
      await answerCallbackQuery(callbackId, result.error || 'Failed to update order');
      return NextResponse.json({ ok: false });
    }

    const badge = STATUS_BADGE[newStatus] ?? newStatus;
    const updatedText = message.text.replace(/\n\n[^\n]+$/, `\n\n${badge}`);

    const nextButtons = getStatusButtons(orderId, newStatus);
    await editTelegramMessage(chatId, msgId, updatedText, nextButtons);

    const toastLabels: Record<string, string> = {
      accepted: 'Order accepted ✅',
      declined: 'Order rejected ❌',
      preparing: 'Preparing 👨‍🍳',
      ready: 'Order ready 🍽️',
      out_for_delivery: 'Out for delivery 🚚',
      delivered: 'Delivered 📦',
      completed: 'Completed ✅',
      cancelled: 'Cancelled ❌',
    };
    await answerCallbackQuery(callbackId, toastLabels[newStatus] ?? 'Done');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Internal error' });
  }
}
