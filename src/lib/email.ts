import nodemailer from 'nodemailer';

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
