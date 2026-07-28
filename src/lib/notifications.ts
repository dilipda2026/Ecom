import { sendTelegramMessageWithButtons } from './telegram';
import { sendOrderNotificationEmail } from './email';

interface OrderInfo {
  id: string;
  trackingCode: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: string;
  address: string;
  customerName: string | null;
  customerPhone: string | null;
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
    `💳 ${order.paymentMethod.toUpperCase()}\n` +
    `💰 <b>₹${order.total}</b>\n` +
    `📍 ${order.address}\n\n` +
    `<b>Items:</b>\n${items}`
  );
}

export async function notifyNewOrder(order: OrderInfo) {
  const buttons = [
    [
      { text: '✅ Accept', callback_data: `accept:${order.id}` },
      { text: '❌ Reject', callback_data: `reject:${order.id}` },
    ],
  ];

  await sendTelegramMessageWithButtons(`${formatTelegram(order)}\n\n⏳ <b>Pending</b>`, buttons);

  const emailTo = process.env.NOTIFICATION_EMAIL;
  if (emailTo) {
    sendOrderNotificationEmail(emailTo, order).catch(() => {});
  }
}
