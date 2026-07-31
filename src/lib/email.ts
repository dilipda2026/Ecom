import nodemailer from 'nodemailer';
import { orderTypeLabel } from '@/features/orders/types';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  const t = getTransporter();

  if (!t) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV EMAIL] To: ${to}, OTP: ${otp}`);
      return true;
    }
    return false;
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || 'noreply@dilipda.com',
      to,
      subject: 'Your CIT Student Verification OTP',
      text: `Your OTP for CIT student verification is: ${otp}\n\nThis OTP expires in 10 minutes.\n\n- Dilip Da`,
      html: `<p>Your OTP for CIT student verification is:</p><h2>${otp}</h2><p>This OTP expires in <strong>10 minutes</strong>.</p><p>- Dilip Da</p>`,
    });
    return true;
  } catch {
    return false;
  }
}

interface OrderNotificationInfo {
  trackingCode: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: string;
  address: string;
  customerName: string | null;
  customerPhone: string | null;
  orderType?: string | null;
}

export async function sendOrderNotificationEmail(to: string, order: OrderNotificationInfo): Promise<boolean> {
  if (!to) return false;
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV EMAIL] Order notification for ${order.trackingCode}`);
      return true;
    }
    return false;
  }

  const itemsHtml = order.items.map((i) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">₹${i.price}</td></tr>`).join('');

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || 'noreply@dilipda.com',
      to,
      subject: `🆕 New Order — ${order.trackingCode}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#EF4444">🆕 New Order Received</h2>
          <p><strong>Tracking:</strong> ${order.trackingCode}</p>
          <p><strong>Customer:</strong> ${order.customerName || 'Guest'}</p>
          <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
          <p><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()}</p>
          ${order.orderType ? `<p><strong>Order Type:</strong> ${orderTypeLabel(order.orderType)}</p>` : ''}
          <p><strong>Delivery:</strong> ${order.address}</p>
          <table style="width:100%;border-collapse:collapse;margin:12px 0">
            <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:center">Qty</th><th style="padding:8px;text-align:right">Price</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="font-size:18px;font-weight:bold;text-align:right">Total: ₹${order.total}</p>
        </div>
      `,
    });
    return true;
  } catch {
    return false;
  }
}
