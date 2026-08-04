'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getDeliveryDashboard,
  getDeliveryHistory,
  generateDeliveryQr,
  startPickupManual,
  startPickupByToken,
  startPickupByTrackingCode,
  generateOtpForOrder,
  verifyOtpForDelivery,
  recordPaymentCollection,
  recordDoorPayment,
  markOrderDelivered,
} from '@/features/delivery/actions';
import type { DeliveryDashboardData, DeliveryHistoryEntry } from '@/features/delivery/types';
import { orderTypeLabel } from '@/features/orders/types';
import { usePolling } from '@/hooks/usePolling';
import { showToast } from '@/components/shared/Toast';
import { useAuthStore } from '@/features/auth/store';
import { STORE_CONFIG } from '@/config/store';
import { groupDeliveriesByDay } from '@/features/delivery/lib/history';
import { Loader2, Bike, QrCode, ScanLine, KeyRound, Banknote, CheckCircle2, Check, Clock, Phone, ChevronDown, ChevronUp, User, LogOut, Upload, MapPin, CameraOff, TrendingUp, Wallet, Search, CalendarDays } from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

function decodeQrFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        resolve(code?.data ?? null);
      };
      img.onerror = () => resolve(null);
      img.src = String(reader.result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

const POLL_INTERVAL_MS = 30_000;

type ModalState =
  | { type: 'qr'; orderId: string; trackingCode: string }
  | { type: 'scan' }
  | { type: 'otp'; orderId: string }
  | { type: 'verify'; orderId: string }
  | { type: 'pay'; orderId: string }
  | { type: 'payqr'; orderId: string; total: number; trackingCode: string }
  | null;

export default function DeliveryDashboard() {
  const [data, setData] = useState<DeliveryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<'scan' | 'active'>('scan');
  const router = useRouter();
  const { signOut } = useAuthStore();

  const load = useCallback(async (silent = false) => {
    const res = await getDeliveryDashboard();
    if (res.success && res.data) {
      setData(res.data);
      if (res.data.active.length > 0) setView('active');
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  usePolling(() => { load(true); }, POLL_INTERVAL_MS);

  async function run(action: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(action);
    const res = await fn();
    setBusy(null);
    if (res.success) {
      showToast('Done');
      setModal(null);
      load(true);
    } else {
      showToast(res.error ?? 'Failed');
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/auth/login');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="page-pad flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-ztext-lighter" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-pad">
        <div className="container-z mx-auto max-w-lg text-center py-16">
          <Bike size={40} className="mx-auto mb-4 text-ztext-muted/30" />
          <h1 className="text-xl font-bold text-ztext">Delivery dashboard</h1>
          <p className="text-ztext-light text-sm mt-2">Your delivery partner profile could not be loaded.</p>
        </div>
      </div>
    );
  }

  const firstActive = data.active[0];

  return (
    <div className="page-pad pb-28">
      <div className="container-z mx-auto max-w-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ztext">Delivery dashboard</h1>
            <p className="mt-1 text-ztext-light text-sm">
              {data.partner.vehicle_type} • {data.partner.license_plate || 'no plate'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link href="/dashboard/delivery/profile" className="icon-button-z" aria-label="Profile">
              <User size={18} />
            </Link>
            <button onClick={handleSignOut} className="icon-button-z" aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 grid-cols-2">
          {[
            { icon: Clock, label: 'Active now', value: String(data.active.length), sub: 'deliveries in progress' },
            { icon: CheckCircle2, label: 'Today', value: String(data.stats.today.count), sub: `₹${data.stats.today.value.toLocaleString('en-IN')}` },
            { icon: TrendingUp, label: 'This week', value: String(data.stats.week.count), sub: `₹${data.stats.week.value.toLocaleString('en-IN')}` },
            { icon: Wallet, label: 'All time', value: String(data.stats.total.count), sub: `₹${data.stats.total.value.toLocaleString('en-IN')}` },
          ].map((s) => (
            <div key={s.label} className="bg-zcard rounded-xl shadow-z p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 shrink-0 text-zred">
                  <s.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-ztext-light truncate">{s.label}</p>
                  <p className="font-bold text-ztext text-sm">{s.value}</p>
                  <p className="text-[10px] text-ztext-lighter truncate">{s.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {view === 'active' && firstActive ? (
          <>
            <div className="mt-6 space-y-4">
              {data.active.map(({ assignment, order }) => (
                <OrderCard
                  key={assignment.id}
                  assignment={assignment}
                  order={order}
                  setModal={setModal}
                  busy={busy}
                  run={run}
                />
              ))}
            </div>
            <button onClick={() => setView('scan')} className="mt-5 w-full button-z button-z-outline h-11 text-sm flex items-center justify-center gap-2">
              <ScanLine size={16} /> Back to scanner
            </button>
          </>
        ) : (
          <>
            <ScanPane
              onClaimed={() => {
                showToast('Order claimed — start the delivery');
                load(true);
              }}
            />
            {data.active.length > 0 && (
              <button onClick={() => setView('active')} className="mt-4 w-full button-z button-z-primary h-11 text-sm flex items-center justify-center gap-2">
                <Bike size={16} /> View active delivery ({data.active.length})
              </button>
            )}
          </>
        )}

        <HistorySection />
      </div>

      {modal?.type === 'qr' && <QrModal orderId={modal.orderId} trackingCode={modal.trackingCode} onClose={() => setModal(null)} />}
      {modal?.type === 'scan' && <ScanModal onClose={() => setModal(null)} />}
      {modal?.type === 'otp' && <OtpModal orderId={modal.orderId} onClose={() => setModal(null)} />}
      {modal?.type === 'verify' && <VerifyModal orderId={modal.orderId} onClose={() => setModal(null)} />}
      {modal?.type === 'pay' && <PayModal orderId={modal.orderId} onClose={() => setModal(null)} />}
      {modal?.type === 'payqr' && (
        <PayQrModal
          orderId={modal.orderId}
          total={modal.total}
          trackingCode={modal.trackingCode}
          onClose={() => { setModal(null); load(true); }}
        />
      )}
    </div>
  );
}

function ScanPane({ onClaimed }: { onClaimed: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onClaimedRef = useRef(onClaimed);
  useEffect(() => {
    onClaimedRef.current = onClaimed;
  });
  const [camera, setCamera] = useState<'starting' | 'running' | 'error'>('starting');
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCamera('running');
        tick();
      } catch {
        if (!stopped) setCamera('error');
      }
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(image.data, image.width, image.height);
          if (decoded?.data) {
            setBusy(true);
            startPickupByToken(decoded.data).then((res) => {
              setBusy(false);
              if (res.success) onClaimedRef.current();
              else { setError(res.error ?? 'Invalid QR'); tick(); }
            });
            return;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt]);

  async function claimByCode() {
    if (code.trim().length === 0) return;
    setBusy(true);
    const res = await startPickupByTrackingCode(code);
    setBusy(false);
    if (res.success) { setCode(''); onClaimed(); }
    else setError(res.error ?? 'Could not start pickup');
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadBusy(true);
    setError('');
    try {
      const token = await decodeQrFromFile(file);
      if (!token) {
        setError('No QR code found in the image. Try a clearer photo.');
        setUploadBusy(false);
        return;
      }
      const res = await startPickupByToken(token);
      if (res.success) onClaimed();
      else setError(res.error ?? 'Invalid QR');
    } catch {
      setError('Could not read the image');
    }
    setUploadBusy(false);
    e.target.value = '';
  }

  return (
    <div className="mt-6">
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center">
        <video ref={videoRef} muted autoPlay playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {busy && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
            <Loader2 className="text-white w-6 h-6 animate-spin" />
            <p className="text-white text-xs">Processing…</p>
          </div>
        )}
        {camera === 'starting' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
            <Loader2 className="text-white w-6 h-6 animate-spin" />
            <p className="text-white text-xs">Starting camera…</p>
          </div>
        )}
        {camera === 'error' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <CameraOff size={28} className="text-white/70" />
            <p className="text-white text-sm font-medium">Camera unavailable</p>
            <p className="text-white/60 text-xs">Allow camera access for this site, or use the upload / manual options below.</p>
            <button onClick={() => { setError(''); setAttempt((a) => a + 1); }} className="button-z button-z-primary h-10 px-4 text-sm">
              Retry camera
            </button>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 rounded-2xl border-2 border-white/70" />
        </div>
      </div>
      <p className="text-xs text-ztext-light mt-2 text-center">Point the camera at the store&apos;s pickup QR to claim an order.</p>
      {error && <p className="text-sm text-zred mt-2 text-center">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy || uploadBusy}
          className="button-z button-z-outline flex-1 h-11 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploadBusy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Upload QR image
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') claimByCode(); }}
          placeholder="Tracking code or order ID"
          className="input-z flex-1 font-mono text-sm"
          disabled={busy || uploadBusy}
        />
        <button onClick={claimByCode} disabled={busy || uploadBusy || code.trim().length === 0} className="button-z button-z-outline h-11 px-4 text-sm disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : 'Go'}
        </button>
      </div>
      <p className="text-[11px] text-ztext-lighter mt-1.5">Typing a code or order ID only works for orders already assigned to you — use the QR to claim new ones.</p>
    </div>
  );
}

function OrderCard({ assignment, order, setModal, busy, run }: {
  assignment: DeliveryDashboardData['active'][number]['assignment'];
  order: DeliveryDashboardData['active'][number]['order'];
  setModal: (m: ModalState) => void;
  busy: string | null;
  run: (a: string, fn: () => Promise<{ success: boolean; error?: string }>) => Promise<void>;
}) {
  if (!order) return null;
  const address = order.delivery_address as Record<string, string> | null;
  const isCod = order.payment_method === 'cod';
  const otpVerified = !!assignment.otp_verified_at;
  const otpActive = !!assignment.otp_expires_at && new Date(assignment.otp_expires_at).getTime() > Date.now();
  const paymentCollected = isCod ? order.payment_status === 'confirmed' : true;

  const statusLabel = order.status.replace(/_/g, ' ');
  const paymentLabel = isCod
    ? 'Pay on Delivery'
    : order.payment_method === 'razorpay'
      ? paymentCollected ? 'Paid online' : 'Pay at door (UPI QR)'
      : order.payment_method === 'bnpl'
        ? 'BNPL credit'
        : (order.payment_method ?? '').toUpperCase();

  return (
    <div className="bg-zcard rounded-xl shadow-z p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold text-ztext">{order.tracking_code}</p>
          <p className="text-xs text-ztext-light capitalize">{statusLabel} • {orderTypeLabel(order.order_type) || 'Delivery'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${isCod || !paymentCollected ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {paymentLabel}
          </span>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="icon-button-z" aria-label="Call customer">
              <Phone size={16} />
            </a>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-zsurface/60 border border-zborder p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <User size={15} className="text-zred shrink-0" />
          <span className="font-semibold text-ztext truncate">{order.customer_name ?? 'Customer'}</span>
        </div>
        {address?.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={15} className="text-zred shrink-0 mt-0.5" />
            <span className="text-ztext-light">
              {address.address}{address.city ? `, ${address.city}` : ''}{address.pincode ? ` - ${address.pincode}` : ''}
            </span>
          </div>
        )}
      </div>

      {order.order_items && order.order_items.length > 0 && (
        <div className="mt-3 rounded-xl bg-zsurface/60 border border-zborder p-3">
          <p className="text-[11px] font-semibold text-ztext-lighter uppercase tracking-wider mb-2">Items</p>
          <div className="space-y-1.5">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm gap-2">
                <span className="text-ztext-light">{item.quantity}x {item.product_name}</span>
                <span className="font-medium text-ztext shrink-0">₹{item.subtotal}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-zborder mt-2 pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-ztext-lighter"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
            <div className="flex justify-between text-ztext-lighter"><span>Delivery</span><span>{order.delivery_fee > 0 ? `₹${order.delivery_fee}` : 'Free'}</span></div>
            <div className="flex justify-between font-bold text-ztext text-sm"><span>Total</span><span>₹{order.total}</span></div>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-1.5 text-sm">
        {isCod && (
          <div className="flex justify-between">
            <span>Payment</span>
            <span className={`font-medium ${paymentCollected ? 'text-green-500' : 'text-yellow-500'}`}>
              {paymentCollected ? 'Collected at door ✓' : `Collect ₹${order.total} (Cash/UPI/Card)`}
            </span>
          </div>
        )}
        {!isCod && (
          <div className="flex justify-between">
            <span>Payment</span>
            <span className={`font-medium ${paymentCollected ? 'text-green-500' : 'text-yellow-500'}`}>
              {paymentCollected ? 'Paid at door ✓' : 'Pending — show the payment QR'}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>OTP check</span>
          <span className={`font-medium ${otpVerified ? 'text-green-500' : assignment.otp_expires_at ? 'text-red-400' : 'text-ztext-light'}`}>
            {otpVerified
              ? 'Verified ✓'
              : assignment.otp_expires_at
                ? (otpActive ? 'Sent — ask customer' : 'Expired — resend')
                : 'Not generated'}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {order.status === 'assigned' && (
          <>
            <button onClick={() => setModal({ type: 'qr', orderId: order.id, trackingCode: order.tracking_code })} className="button-z button-z-outline text-xs h-9 flex items-center gap-1.5">
              <QrCode size={14} /> Pickup QR
            </button>
            <button onClick={() => setModal({ type: 'scan' })} className="button-z button-z-outline text-xs h-9 flex items-center gap-1.5">
              <ScanLine size={14} /> Scan QR
            </button>
            <button onClick={() => run(`pickup-${order.id}`, () => startPickupManual(order.id))} disabled={busy !== null} className="button-z button-z-primary text-xs h-9 flex items-center gap-1.5 disabled:opacity-50">
              {busy === `pickup-${order.id}` ? <Loader2 size={14} className="animate-spin" /> : <Bike size={14} />}
              Start pickup
            </button>
          </>
        )}
        {order.status === 'out_for_delivery' && (
          <>
            {!isCod && !paymentCollected && (
              <button onClick={() => setModal({ type: 'payqr', orderId: order.id, total: Number(order.total), trackingCode: order.tracking_code })} className="button-z button-z-outline text-xs h-9 flex items-center gap-1.5">
                <QrCode size={14} /> Payment QR
              </button>
            )}
            {!otpActive && (
              <button onClick={() => setModal({ type: 'otp', orderId: order.id })} className="button-z button-z-outline text-xs h-9 flex items-center gap-1.5 disabled:opacity-50" disabled={!isCod && !paymentCollected}>
                <KeyRound size={14} /> {assignment.otp_expires_at ? 'Resend OTP' : 'Generate OTP'}
              </button>
            )}
            <button onClick={() => setModal({ type: 'verify', orderId: order.id })} className="button-z button-z-outline text-xs h-9 flex items-center gap-1.5 disabled:opacity-50" disabled={!otpActive}>
              <ScanLine size={14} /> Verify OTP
            </button>
            {isCod && (
              <button onClick={() => setModal({ type: 'pay', orderId: order.id })} className="button-z button-z-outline text-xs h-9 flex items-center gap-1.5 disabled:opacity-50" disabled={!otpVerified || paymentCollected}>
                <Banknote size={14} /> Collect payment
              </button>
            )}
            <button
              onClick={() => run(`deliver-${order.id}`, () => markOrderDelivered(order.id))}
              disabled={busy !== null || !otpVerified || (isCod && !paymentCollected)}
              className="button-z button-z-primary text-xs h-9 flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy === `deliver-${order.id}` ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Mark delivered
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-zcard rounded-2xl p-6 max-w-sm w-full shadow-z-modal max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-ztext">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zgray rounded-lg text-ztext-light">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function QrModal({ orderId, trackingCode, onClose }: { orderId: string; trackingCode: string; onClose: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);

  useEffect(() => {
    generateDeliveryQr(orderId).then((res) => {
      if (res.success && res.data) {
        QRCode.toDataURL(res.data.token, { width: 240, margin: 1 }).then(setQr);
        setExpiresIn(Math.max(0, Math.floor((res.data.expiresAt - Date.now()) / 1000)));
      } else {
        setError(res.error ?? 'Failed to generate QR');
      }
    });
  }, [orderId]);

  useEffect(() => {
    if (expiresIn <= 0) return;
    const id = setInterval(() => setExpiresIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [expiresIn]);

  return (
    <ModalShell title="Pickup QR" onClose={onClose}>
      {error ? (
        <p className="text-sm text-zred">{error}</p>
      ) : qr ? (
        <div className="text-center">
          <Image src={qr} alt="Pickup QR" width={240} height={240} className="mx-auto rounded-xl border border-zborder" unoptimized />
          <p className="font-mono text-xs text-ztext-lighter mt-3">{trackingCode}</p>
          <p className="text-xs text-ztext-light mt-1">
            {expiresIn > 0 ? `Valid for ${Math.floor(expiresIn / 60)}m ${expiresIn % 60}s` : 'Expired — regenerate'}
          </p>
          <p className="text-[11px] text-ztext-lighter mt-3">Show this at the restaurant to pick up the order.</p>
        </div>
      ) : (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-ztext-lighter" /></div>
      )}
    </ModalShell>
  );
}

function ScanModal({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setError('Camera unavailable — start pickup manually instead.');
      }
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(image.data, image.width, image.height);
          if (code?.data) {
            setBusy(true);
            startPickupByToken(code.data).then((res) => {
              setBusy(false);
              if (res.success) { showToast('Pickup confirmed'); onClose(); }
              else { setError(res.error ?? 'Invalid QR'); tick(); }
            });
            return;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onClose]);

  return (
    <ModalShell title="Scan pickup QR" onClose={onClose}>
      <div className="relative rounded-xl overflow-hidden bg-black aspect-square flex items-center justify-center">
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {busy && <Loader2 className="absolute text-white w-6 h-6 animate-spin" />}
      </div>
      {error && <p className="text-sm text-zred mt-3">{error}</p>}
      <p className="text-xs text-ztext-light mt-3">Point the camera at the order&apos;s pickup QR. You can also use the Start pickup button instead.</p>
    </ModalShell>
  );
}

function OtpModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [generated, setGenerated] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (generated && expiresIn > 0) {
      const id = setInterval(() => setExpiresIn((s) => Math.max(0, s - 1)), 1000);
      return () => clearInterval(id);
    }
  }, [generated, expiresIn]);

  async function generate() {
    setBusy(true);
    setError('');
    const res = await generateOtpForOrder(orderId);
    setBusy(false);
    if (res.success && res.data) {
      setGenerated(true);
      setExpiresIn(Math.floor((new Date(res.data.expiresAt).getTime() - Date.now()) / 1000));
    } else {
      setError(res.error ?? 'Failed');
    }
  }

  return (
    <ModalShell title="Generate delivery OTP" onClose={onClose}>
      {generated ? (
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-zgreen/15 text-zgreen flex items-center justify-center mx-auto">
            <Check size={22} />
          </div>
          <p className="text-sm font-bold text-ztext mt-3">OTP sent to the customer</p>
          <p className="text-xs text-ztext-light mt-2">
            The 6-digit code was emailed to the customer and is shown on their order page. Ask them to read it out to you.
          </p>
          {expiresIn > 0 ? (
            <p className="text-xs text-ztext-lighter mt-3">
              Valid for {Math.floor(expiresIn / 60)}m {expiresIn % 60}s
            </p>
          ) : (
            <div className="mt-3">
              <p className="text-xs text-zred">This OTP has expired.</p>
              <button onClick={generate} disabled={busy} className="w-full mt-2 py-2.5 rounded-xl border border-zred/30 text-xs font-semibold text-zred hover:bg-red-500/5 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                Resend new OTP
              </button>
            </div>
          )}
          <button onClick={onClose} className="button-z button-z-primary w-full h-11 text-sm mt-4">
            Done — then Verify OTP
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {error && <p className="text-sm text-zred">{error}</p>}
          <p className="text-xs text-ztext-light">The OTP will be sent to the customer by email — you will not see it.</p>
          <button onClick={generate} disabled={busy} className="button-z button-z-primary w-full h-11 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Generate OTP
          </button>
        </div>
      )}
    </ModalShell>
  );
}

function VerifyModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function verify() {
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    setBusy(true);
    const res = await verifyOtpForDelivery(orderId, otp);
    setBusy(false);
    if (res.success) { showToast('OTP verified'); onClose(); }
    else setError(res.error ?? 'Verification failed');
  }

  return (
    <ModalShell title="Verify customer OTP" onClose={onClose}>
      <div className="space-y-3">
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          className="input-z w-full font-mono tracking-widest text-center text-lg"
          maxLength={6}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
        />
        {error && <p className="text-sm text-zred">{error}</p>}
        <button onClick={verify} disabled={busy || otp.length !== 6} className="button-z button-z-primary w-full h-11 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
          Verify
        </button>
      </div>
    </ModalShell>
  );
}

function PayModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const methods = [
    { id: 'cash' as const, label: 'Cash', icon: '💵' },
    { id: 'upi' as const, label: 'UPI', icon: '📱' },
    { id: 'card' as const, label: 'Card', icon: '💳' },
  ];

  async function collect(method: 'cash' | 'upi' | 'card') {
    setBusy(true);
    const res = await recordPaymentCollection(orderId, method);
    setBusy(false);
    if (res.success) { showToast('Payment collected'); onClose(); }
    else showToast(res.error ?? 'Failed');
  }

  return (
    <ModalShell title="Collect payment at door" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        {methods.map((m) => (
          <button key={m.id} onClick={() => collect(m.id)} disabled={busy}
            className="p-4 rounded-xl border-2 border-zborder hover:border-zred disabled:opacity-50 transition-colors text-center">
            <div className="text-2xl">{m.icon}</div>
            <div className="text-sm font-medium text-ztext mt-1">{m.label}</div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ztext-lighter mt-3">This marks the order as paid. Hand the customer their food afterwards.</p>
    </ModalShell>
  );
}

function PayQrModal({ orderId, total, trackingCode, onClose }: { orderId: string; total: number; trackingCode: string; onClose: () => void }) {
  const [qrData, setQrData] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const upiId = STORE_CONFIG.upiId.trim();
  const configError = upiId ? '' : 'Store UPI ID not configured yet.';

  useEffect(() => {
    if (!upiId) return;
    let cancelled = false;
    const upi = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(STORE_CONFIG.upiName)}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`DD ${trackingCode}`)}`;
    QRCode.toDataURL(upi, { width: 640, margin: 2 })
      .then((url) => { if (!cancelled) setQrData(url); })
      .catch(() => { if (!cancelled) setError('Could not render the payment QR.'); });
    return () => { cancelled = true; };
  }, [upiId, total, trackingCode]);

  async function confirmPaid() {
    setBusy(true);
    const res = await recordDoorPayment(orderId);
    setBusy(false);
    if (res.success) { setDone(true); showToast('Payment confirmed'); }
    else setError(res.error ?? 'Failed to confirm payment');
  }

  return (
    <ModalShell title="Payment QR" onClose={onClose}>
      {done ? (
        <div className="text-center space-y-3">
          <p className="text-3xl">✅</p>
          <p className="text-sm text-ztext font-medium">Payment confirmed</p>
          <p className="text-xs text-ztext-light">The customer will receive their delivery OTP by email.</p>
          <button onClick={onClose} className="button-z button-z-primary w-full h-11 text-sm">Continue</button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ztext font-medium">Ask the customer to scan this QR and pay ₹{total}</p>
          {qrData ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrData} alt="Payment QR" className="w-56 h-56 rounded-xl border border-zborder bg-white p-2" />
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-ztext-lighter">
              {configError || error || 'Preparing QR…'}
            </div>
          )}
          <p className="text-[11px] text-ztext-lighter">After the customer pays, tap below — the delivery OTP will be emailed to them.</p>
          {error && <p className="text-sm text-zred">{error}</p>}
          <button onClick={confirmPaid} disabled={busy || !qrData} className="button-z button-z-primary w-full h-11 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Payment received
          </button>
        </div>
      )}
    </ModalShell>
  );
}

function HistorySection() {
  const [entries, setEntries] = useState<DeliveryHistoryEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    if (entries !== null) return;
    setLoading(true);
    const res = await getDeliveryHistory();
    setLoading(false);
    if (res.success && res.data) setEntries(res.data.entries);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && entries === null) loadHistory();
  }

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        (e.order?.tracking_code ?? '').toLowerCase().includes(q) ||
        (e.order?.customer_name ?? '').toLowerCase().includes(q),
    );
  }, [entries, query]);

  const groups = useMemo(() => groupDeliveriesByDay(filtered), [filtered]);

  return (
    <div className="mt-8 bg-zcard rounded-xl shadow-z">
      <button onClick={toggle} className="w-full flex items-center justify-between p-4 text-sm font-bold text-ztext">
        <span className="flex items-center gap-2">
          <CalendarDays size={16} className="text-zred" />
          Delivery history
          {entries !== null && <span className="text-xs font-normal text-ztext-light">({entries.length})</span>}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          {entries === null ? (
            <div className="py-4 flex items-center justify-center">
              {loading ? <Loader2 size={18} className="animate-spin text-ztext-lighter" /> : null}
            </div>
          ) : (
            <>
              {entries.length > 0 && (
                <div className="relative mb-3">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ztext-lighter" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tracking code or customer"
                    className="input-z pl-9 text-sm"
                  />
                </div>
              )}
              {groups.length === 0 ? (
                <p className="text-sm text-ztext-light py-2">
                  {entries.length === 0 ? 'No deliveries yet. Your completed deliveries will show up here.' : 'No deliveries match your search.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {groups.map((g) => (
                    <div key={g.key}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ztext">{g.label}</span>
                        <span className="text-ztext-lighter">
                          {g.entries.length} delivery{g.entries.length === 1 ? '' : 'ies'} •{' '}
                          <span className="font-bold text-ztext">₹{g.totalValue.toLocaleString('en-IN')}</span>
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-1.5">
                        {g.entries.map(({ assignment, order }) => (
                          <div key={assignment.id} className="flex items-center justify-between text-xs py-2 px-2.5 rounded-lg bg-zsurface/60 border border-zborder">
                            <div className="min-w-0">
                              <p className="font-mono font-medium text-ztext truncate">{order?.tracking_code ?? assignment.order_id}</p>
                              <p className="text-ztext-lighter truncate">
                                {order?.order_items ? `${order.order_items.reduce((s, i) => s + i.quantity, 0)} item(s)` : ''}
                                {order?.customer_name ? ` • ${order.customer_name}` : ''}
                                {order?.payment_method ? ` • ${order.payment_method.toUpperCase()}` : ''}
                              </p>
                            </div>
                            <div className="text-right shrink-0 pl-3">
                              <p className="font-bold text-ztext">₹{Number(order?.total ?? 0).toLocaleString('en-IN')}</p>
                              <p className="text-ztext-lighter">
                                {assignment.delivered_at ? new Date(assignment.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
