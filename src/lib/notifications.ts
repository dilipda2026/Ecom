import { sendTelegramMessageWithButtons, sendTelegramPhoto } from './telegram';
import { sendOrderNotificationEmail } from './email';
import { getSetting } from '@/lib/settings';
import QRCode from 'qrcode';

interface OrderInfo {
  id: string;
  trackingCode: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: string;
  address: string;
  customerName: string | null;
  customerPhone: string | null;
  orderType?: string | null;
}

function orderTypeBadge(type: string | null | undefined): string {
  switch (type) {
    case 'room_delivery': return '🚚 Hostel Delivery';
    case 'takeaway': return '🥡 Take Away';
    default: return '';
  }
}

function formatTelegram(order: OrderInfo): string {
  const items = order.items
    .map((i) => `  • ${i.name} ×${i.quantity} — ₹${i.price * i.quantity}`)
    .join('\n');

  return (
    `<b>🆕 New Order!</b>\n` +
    `📦 <b>#${order.trackingCode}</b>\n` +
    (order.customerName ? `👤 ${order.customerName}\n` : '') +
    (order.customerPhone ? `📞 ${order.customerPhone}\n` : '') +
    (order.orderType ? `🎯 ${orderTypeBadge(order.orderType)}\n` : '') +
    `💳 ${order.paymentMethod.toUpperCase()}\n` +
    `💰 <b>₹${order.total}</b>\n` +
    `📍 ${order.address}\n\n` +
    `<b>Items:</b>\n${items}`
  );
}

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

interface ButtonDef {
  text: string;
  status: string;
}

const STATUS_ACTIONS: Record<string, ButtonDef[]> = {
  pending: [
    { text: '✅ Accept', status: 'accepted' },
    { text: '👨‍🍳 Preparing', status: 'preparing' },
    { text: '❌ Reject', status: 'declined' },
  ],
  accepted: [
    { text: '👨‍🍳 Preparing', status: 'preparing' },
    { text: '❌ Cancel', status: 'cancelled' },
  ],
  preparing: [
    { text: '🍽️ Ready', status: 'ready' },
    { text: '❌ Cancel', status: 'cancelled' },
  ],
  ready: [
    { text: '🚚 Out for Delivery', status: 'out_for_delivery' },
    { text: '✅ Complete', status: 'completed' },
  ],
  out_for_delivery: [
    { text: '📦 Delivered', status: 'delivered' },
  ],
  delivered: [
    { text: '✅ Complete', status: 'completed' },
  ],
};

export function getStatusButtons(orderId: string, currentStatus: string): Array<Array<{ text: string; callback_data: string }>> {
  const actions = STATUS_ACTIONS[currentStatus];
  if (!actions || actions.length === 0) return [];
  return [actions.map((a) => ({ text: a.text, callback_data: `${a.status}:${orderId}` }))];
}

export async function notifyNewOrder(order: OrderInfo, currentStatus = 'pending', qrToken: string | null = null) {
  const buttons = getStatusButtons(order.id, currentStatus);
  const badge = STATUS_BADGE[currentStatus] ?? currentStatus;

  await sendTelegramMessageWithButtons(`${formatTelegram(order)}\n\n${badge}`, buttons);

  if (qrToken) {
    try {
      const png = await QRCode.toBuffer(qrToken, { type: 'png', width: 512, margin: 2 });
      const caption = `🪪 <b>Pickup QR</b> — #${order.trackingCode}\nShow this at the store to assign a delivery partner.`;
      await sendTelegramPhoto(caption, png);
    } catch {}
  }

  const emailTo = (await getSetting('notification_email')) || (await getSetting('store_support_email')) || process.env.NOTIFICATION_EMAIL;
  if (emailTo) {
    sendOrderNotificationEmail(emailTo, order).catch(() => {});
  }
}
