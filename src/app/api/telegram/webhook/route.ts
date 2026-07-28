import { NextResponse } from 'next/server';
import { createServiceClient } from '@/infrastructure/supabase/service';
import { editTelegramMessage, answerCallbackQuery } from '@/lib/telegram';

async function transitionOrder(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  orderId: string,
  statuses: string[]
): Promise<boolean> {
  for (const status of statuses) {
    const { data: current } = await supabase
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

    const { error } = await supabase
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

    const [action, orderId] = data.split(':') as [string, string];
    const chatId = message.chat.id;
    const msgId = message.message_id;

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

    let success = false;
    let newStatus = '';
    let label = '';

    if (action === 'accept') {
      if (orderData.status !== 'pending') {
        await answerCallbackQuery(callbackId, 'Order is no longer pending');
        return NextResponse.json({ ok: false });
      }
      success = await transitionOrder(supabase, orderId, ['accepted']);
      newStatus = 'accepted';
      label = '✅ Accepted';
    } else if (action === 'reject') {
      if (orderData.status !== 'pending') {
        await answerCallbackQuery(callbackId, 'Order is no longer pending');
        return NextResponse.json({ ok: false });
      }
      success = await transitionOrder(supabase, orderId, ['declined']);
      newStatus = 'declined';
      label = '❌ Rejected';
    } else if (action === 'out_for_delivery') {
      if (orderData.status !== 'accepted') {
        await answerCallbackQuery(callbackId, 'Order must be accepted first');
        return NextResponse.json({ ok: false });
      }
      success = await transitionOrder(supabase, orderId, ['preparing', 'ready', 'out_for_delivery']);
      newStatus = 'out_for_delivery';
      label = '🚚 Out for Delivery';
    }

    if (!success) {
      await answerCallbackQuery(callbackId, 'Failed to update order');
      return NextResponse.json({ ok: false });
    }

    const updatedText = message.text.replace(
      /\n\n⏳ <b>Pending<\/b>$/,
      `\n\n${label}`
    );

    if (newStatus === 'accepted') {
      await editTelegramMessage(chatId, msgId, updatedText, [
        [{ text: '🚚 Out for Delivery', callback_data: `out_for_delivery:${orderId}` }],
      ]);
    } else {
      await editTelegramMessage(chatId, msgId, updatedText);
    }

    const answerLabels: Record<string, string> = {
      accept: 'Order accepted ✅',
      reject: 'Order rejected ❌',
      out_for_delivery: 'Out for delivery 🚚',
    };
    await answerCallbackQuery(callbackId, answerLabels[action] ?? 'Done');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Internal error' });
  }
}
