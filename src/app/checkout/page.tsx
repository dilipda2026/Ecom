'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Phone, User, CreditCard, Banknote, ArrowLeft, Loader2, ShoppingBag, Shield, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/features/cart/store';
import { useAuthStore } from '@/features/auth/store';
import { loadRazorpayScript, openRazorpayCheckout } from '@/features/payments/services/razorpay';
import { createOrder, confirmPayment, sendOrderNotification } from '@/features/orders/actions/customer';
import { createRazorpayOrder } from '@/features/payments/actions';
import { getWalletDetails, deductWalletBalance } from '@/features/wallet/actions';
import { canPayOnDelivery } from '@/features/orders/types';
import type { OrderType } from '@/features/orders/types';
import { OrderTypeSelector } from '@/components/shared/OrderTypeSelector';

const allPaymentMethods = [
  { id: 'wallet', label: 'Dilip Da Wallet', desc: 'Pay instantly using your wallet cash balance', icon: Wallet },
  { id: 'razorpay', label: 'Pay with Razorpay', desc: 'Credit/Debit card, UPI, Net Banking', icon: CreditCard },
  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when your food arrives', icon: Banknote },
];

const locations = [
  { value: 'SNM, CIT Kokrajhar', label: 'SNM' },
  { value: 'SJ, CIT Kokrajhar', label: 'SJ' },
  { value: 'JD, CIT Kokrajhar', label: 'JD' },
  { value: 'Staff Quarter, CIT Kokrajhar', label: 'Staff Quarter' },
  { value: 'Gambari Girls Hostel, CIT Kokrajhar', label: 'Gambari Girls Hostel' },
  { value: 'Mtech Quarter, CIT Kokrajhar', label: 'Mtech Quarter [T1, T2]' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const store = useCartStore();
  const { items, subtotal, deliveryFee, taxAmount, total, clearCart } = store;
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [orderType, setOrderType] = useState<OrderType | null>('room_delivery');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState(user?.fullName ?? '');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login?next=/checkout');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      getWalletDetails().then((res) => {
        if (res.success && res.data) {
          setWalletBalance(res.data.balance);
        }
      });
    }
  }, [isAuthenticated]);

  async function handleAuthRejected(errorMessage?: string | null) {
    if (!errorMessage) return false;
    const m = errorMessage.toLowerCase();
    if (!m.includes('sign in') && !m.includes('authenticated') && !m.includes('unauthorized') && !m.includes('session')) {
      return false;
    }
    setPlacing(false);
    await useAuthStore.getState().signOut();
    router.replace('/auth/login?next=/checkout');
    return true;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zgray">
        <div className="page-pad">
          <div className="container-z mx-auto max-w-xl flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-ztext-lighter" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-zgray">
        <div className="page-pad">
          <div className="container-z mx-auto max-w-xl text-center py-16">
            <h1 className="text-2xl font-bold text-ztext">Your bag is empty</h1>
            <p className="text-ztext-light mt-2">Add items before checking out.</p>
            <Link href="/" className="button-z button-z-primary mt-6">View menu</Link>
          </div>
        </div>
      </div>
    );
  }

  function buildOrderParams(pm: string) {
    return {
      items,
      subtotal: subtotal(),
      deliveryFee: deliveryFee(),
      taxAmount: taxAmount(),
      total: total(),
      paymentMethod: pm,
      address,
      notes,
      customerPhone,
      customerName: customerName || undefined,
      orderType: orderType ?? undefined,
    };
  }

  async function validateAndPlace(pm: string) {
    setError('');
    if (pm === 'razorpay' && !razorpayKey) {
      setError('Razorpay is not configured. Please choose Wallet or Cash on Delivery.');
      return false;
    }
    if (isDelivery && !address.trim()) { setError('Please enter your delivery address'); return false; }
    if (!customerPhone.trim()) { setError('Please enter your phone number'); return false; }
    setPlacing(true);
    return true;
  }

  async function initiateRazorpayPayment(opts?: { method?: string; description?: string }) {
    const loaded = await loadRazorpayScript();
    if (!loaded || !razorpayKey) {
      setError('Payment could not be initiated. Please try again.');
      setPlacing(false);
      return;
    }

    const rzpResult = await createRazorpayOrder(total() * 100);
    if (!rzpResult.success) {
      setError(rzpResult.error || 'Failed to initiate payment');
      setPlacing(false);
      return;
    }

    openRazorpayCheckout({
      key: razorpayKey,
      amount: rzpResult.data.amount,
      name: 'Dilipda',
      description: opts?.description ?? 'Food order',
      method: opts?.method,
      orderId: rzpResult.data.id,
      prefill: { contact: customerPhone },
      onSuccess: async () => {
        const orderResult = await createOrder(buildOrderParams('razorpay'));
        if (!orderResult.success) {
          if (await handleAuthRejected(orderResult.error)) return;
          setError(orderResult.error ?? 'Payment succeeded but the order could not be saved. Please contact support.');
          setPlacing(false);
          return;
        }
        await confirmPayment(orderResult.data!.orderId);
        await sendOrderNotification(orderResult.data!.orderId, orderResult.data!.qrToken ?? null);
        clearCart();
        router.push(`/order/confirmed?orderId=${orderResult.data!.orderId}`);
      },
      onFailure: (err) => {
        setError(err);
        setPlacing(false);
      },
    });
  }

  async function placeOrder(pm: string) {
    const valid = await validateAndPlace(pm);
    if (!valid) return;

    if (pm === 'wallet') {
      const orderTotal = total();
      const currentBalance = walletBalance ?? 0;
      const CREDIT_LIMIT = 500;

      if (currentBalance - orderTotal < -CREDIT_LIMIT) {
        setError(`Credit limit reached (Max overdraft: ₹${CREDIT_LIMIT}). Current balance: ₹${currentBalance.toLocaleString('en-IN')}, Order Total: ₹${orderTotal.toLocaleString('en-IN')}. Please top up your wallet.`);
        setPlacing(false);
        return;
      }

      const orderResult = await createOrder(buildOrderParams('wallet'));
      if (!orderResult.success) {
        if (await handleAuthRejected(orderResult.error)) return;
        setError(orderResult.error ?? 'Failed to place order');
        setPlacing(false);
        return;
      }

      const deductRes = await deductWalletBalance(orderTotal, orderResult.data!.orderId, `Order #${orderResult.data!.trackingCode}`);
      if (!deductRes.success) {
        setError(deductRes.error || 'Failed to deduct wallet balance');
        setPlacing(false);
        return;
      }

      await confirmPayment(orderResult.data!.orderId);
      await sendOrderNotification(orderResult.data!.orderId, orderResult.data!.qrToken ?? null);
      clearCart();
      router.push(`/order/confirmed?orderId=${orderResult.data!.orderId}`);
      return;
    }

    if (pm === 'razorpay') {
      await initiateRazorpayPayment();
      return;
    }

    const orderResult = await createOrder(buildOrderParams(pm));
    if (!orderResult.success) {
      if (await handleAuthRejected(orderResult.error)) return;
      setError(orderResult.error ?? 'Failed to place order');
      setPlacing(false);
      return;
    }

    await confirmPayment(orderResult.data!.orderId);
    await sendOrderNotification(orderResult.data!.orderId, orderResult.data!.qrToken ?? null);
    clearCart();
    router.push(`/order/confirmed?orderId=${orderResult.data!.orderId}`);
  }

  async function handlePlaceOrder() {
    await placeOrder(paymentMethod);
  }

  async function handleUpiPayment() {
    const valid = await validateAndPlace('razorpay');
    if (!valid) return;
    await initiateRazorpayPayment({ method: 'upi', description: 'Pay via UPI' });
  }

  const isDelivery = orderType === 'room_delivery';

  function handleLocationSelect(value: string) {
    setIsCustomAddress(false);
    setAddress(value);
  }

  function handleCustomToggle() {
    setIsCustomAddress(true);
    setAddress(customAddress);
  }

  return (
    <div className="min-h-screen bg-zgray">
      <div className="page-pad">
        <div className="container-z mx-auto max-w-4xl">
          <Link href="/cart" className="inline-flex items-center gap-1 text-xs text-ztext-light hover:text-zred mb-3 transition-colors">
            <ArrowLeft size={12} /> Back to bag
          </Link>
          <h1 className="text-lg font-bold text-ztext mb-4">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 space-y-3">
              {isDelivery ? (
                <div className="bg-zcard rounded-xl border border-zborder p-4">
                  <h2 className="font-semibold text-ztext mb-3 flex items-center gap-1.5 text-sm">
                    <MapPin size={15} className="text-zred shrink-0" /> Delivery address
                  </h2>
                  <div>
                    <label className="text-[10px] font-semibold text-ztext uppercase tracking-wide mb-1.5 block">Delivery location</label>
                    <div className="space-y-1.5">
                      {locations.map((opt) => (
                        <button key={opt.value} type="button" onClick={() => handleLocationSelect(opt.value)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                            address === opt.value && !isCustomAddress ? 'border-zred bg-red-500/10' : 'border-zborder hover:border-ztext-light'
                          }`}
                        >
                          <span className="font-medium text-ztext">{opt.label}</span>
                          {address === opt.value && !isCustomAddress && <span className="float-right w-3.5 h-3.5 rounded-full bg-zred flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-zcard" /></span>}
                        </button>
                      ))}
                      <div className="w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all border-zborder opacity-50">
                        <span className="text-ztext-light font-medium text-xs">Soon available for nearby PG</span>
                      </div>
                      <button type="button" onClick={handleCustomToggle}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                          isCustomAddress ? 'border-zred bg-red-500/10' : 'border-zborder hover:border-ztext-light'
                        }`}
                      >
                        <span className="font-medium text-ztext">Other (write your own)</span>
                        {isCustomAddress && <span className="float-right w-3.5 h-3.5 rounded-full bg-zred flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-zcard" /></span>}
                      </button>
                      {isCustomAddress && (
                        <input
                          type="text"
                          value={customAddress}
                          onChange={(e) => { setCustomAddress(e.target.value); setAddress(e.target.value); }}
                          placeholder="Type your full address..."
                          className="input-z text-sm"
                          autoFocus
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-zcard rounded-xl border border-zborder p-4">
                  <h2 className="font-semibold text-ztext mb-1 flex items-center gap-1.5 text-sm">
                    <MapPin size={15} className="text-zred shrink-0" /> Pickup
                  </h2>
                  <p className="text-xs text-ztext-light">
                    Your order will be ready for pickup at the restaurant. We will notify you when it&apos;s ready.
                  </p>
                </div>
              )}

              <div className="bg-zcard rounded-xl border border-zborder p-4">
                <h2 className="font-semibold text-ztext mb-3 flex items-center gap-1.5 text-sm">
                  <Phone size={15} className="text-zred shrink-0" /> Contact info
                </h2>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-ztext uppercase tracking-wide mb-1 block">Phone number <span className="text-zred">*</span></label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="input-z text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-ztext uppercase tracking-wide mb-1 block flex items-center gap-1">
                      <User size={11} /> Person Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Name of the person receiving the order"
                      className="input-z text-sm"
                    />
                  </div>
                </div>
              </div>

              <OrderTypeSelector value={orderType} onChange={(v) => { setOrderType(v); if (!canPayOnDelivery(v) && paymentMethod === 'cod') setPaymentMethod('wallet'); }} />

              <div className="bg-zcard rounded-xl border border-zborder p-4">
                <h2 className="font-semibold text-ztext mb-3 flex items-center gap-1.5 text-sm">
                  <CreditCard size={15} className="text-zred shrink-0" /> Payment method
                </h2>
                <div className="space-y-2">
                  {allPaymentMethods.filter((pm) => pm.id !== 'cod' || canPayOnDelivery(orderType)).map((pm) => (
                    <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                        paymentMethod === pm.id
                          ? 'border-zred bg-red-500/10 shadow-z'
                          : 'border-zborder hover:border-ztext-light hover:bg-zgray'
                      }`}
                    >
                      <pm.icon size={16} className={`mt-0.5 shrink-0 ${paymentMethod === pm.id ? 'text-zred' : 'text-ztext-muted'}`} />
                      <div>
                        <p className="font-medium text-ztext text-xs">{pm.label}</p>
                        <p className="text-[10px] text-ztext-light mt-0.5">{pm.desc}</p>
                      </div>
                      {paymentMethod === pm.id && (
                        <span className="ml-auto w-4 h-4 rounded-full bg-zred flex items-center justify-center shrink-0 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-zcard" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'wallet' && (
                  <div className="mt-4 pt-4 border-t border-zborder">
                    <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      walletBalance !== null && (walletBalance - total()) >= -500
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      <div>
                        <p className="text-xs font-bold flex items-center gap-1.5">
                          {walletBalance !== null && (walletBalance - total()) >= -500 ? (
                            <>
                              <CheckCircle2 size={15} /> Dilip Da Wallet (₹500 Overdraft Allowed)
                            </>
                          ) : (
                            <>
                              <AlertCircle size={15} /> Credit Limit Reached (Max Overdraft ₹500)
                            </>
                          )}
                        </p>
                        <p className="text-[11px] mt-0.5 opacity-90">
                          Current Balance: ₹{(walletBalance ?? 0).toLocaleString('en-IN')} &bull; Order: ₹{total().toLocaleString('en-IN')}
                        </p>
                      </div>
                      <Link
                        href="/dashboard/student/wallet"
                        target="_blank"
                        className="px-3 py-1.5 bg-zcard text-ztext border border-zborder rounded-lg text-xs font-bold shrink-0 hover:bg-zgray transition-colors"
                      >
                        + Top Up
                      </Link>
                    </div>
                  </div>
                )}

                {paymentMethod === 'razorpay' && (
                  <div className="mt-4 pt-4 border-t border-zborder">
                    <p className="text-xs font-semibold text-ztext mb-3">Pay using UPI Apps</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={handleUpiPayment} disabled={placing}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zborder hover:border-zred hover:bg-red-500/5 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center p-2">
                          <Image src="/images/Phonepay.png" alt="PhonePe" width={56} height={56} className="object-contain" />
                        </div>
                        <span className="text-xs font-medium text-ztext-light group-hover:text-ztext transition-colors">PhonePe</span>
                      </button>
                      <button type="button" onClick={handleUpiPayment} disabled={placing}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zborder hover:border-zred hover:bg-red-500/5 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex items-center justify-center p-2">
                          <Image src="/images/gpay.jpg" alt="Google Pay" width={56} height={56} className="object-contain" />
                        </div>
                        <span className="text-xs font-medium text-ztext-light group-hover:text-ztext transition-colors">Google Pay</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-ztext-lighter text-center mt-3 flex items-center justify-center gap-1">
                      <Shield size={10} /> Secure payments powered by Razorpay
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-zcard rounded-xl border border-zborder p-4">
                <h2 className="font-semibold text-ztext mb-2 text-sm">Delivery notes (optional)</h2>
                <textarea className="input-z h-16 resize-none text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions for the restaurant..." />
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-zcard rounded-xl border border-zborder p-5 sticky top-24 shadow-z">
                <h2 className="font-bold text-ztext mb-3 flex items-center gap-2 text-sm">
                  <ShoppingBag size={15} className="text-zred" /> Order summary
                </h2>
                <p className="text-xs text-ztext-light mb-2.5">Dilipda &bull; {items.length} item{items.length > 1 ? 's' : ''}</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto text-xs pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-ztext truncate mr-2">{item.quantity}x {item.name}</span>
                      <span className="font-medium text-ztext shrink-0">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-zborder mt-3 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-ztext-light"><span>Subtotal</span><span className="font-medium text-ztext">₹{subtotal()}</span></div>
                  <div className="flex justify-between text-ztext-light"><span>Delivery fee</span><span className="font-medium text-ztext">{deliveryFee() > 0 ? `₹${deliveryFee()}` : 'Free'}</span></div>
                  <div className="flex justify-between text-ztext-light"><span>Tax</span><span className="font-medium text-ztext">₹{taxAmount()}</span></div>
                  <div className="border-t border-zborder pt-2.5 flex justify-between font-bold text-ztext text-sm"><span>Total</span><span>₹{total()}</span></div>
                </div>
                {error && <p className="text-xs mt-2 flex items-center gap-1 text-zred"><span className="w-1.5 h-1.5 rounded-full bg-zred" />{error}</p>}
                <button onClick={handlePlaceOrder} disabled={placing || (isDelivery && !address.trim()) || !customerPhone.trim()} className="button-z button-z-primary w-full mt-3 h-10 text-xs font-bold" style={{ opacity: ((isDelivery && !address.trim()) || !customerPhone.trim()) && !placing ? 0.6 : 1 }}>
                  {placing ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</span>
                  ) : (
                    `Place order • ₹${total()}`
                  )}
                </button>
                <p className="text-[10px] text-ztext-lighter text-center mt-2.5">By placing this order, you agree to our Terms of Service</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
