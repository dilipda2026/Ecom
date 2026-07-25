'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, CreditCard, Banknote, ArrowLeft, ShieldCheck, Loader2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/features/cart/store';
import { loadRazorpayScript, openRazorpayCheckout } from '@/features/payments/services/razorpay';
import { processBNPLCheckout } from '@/features/bnpl/actions';
import BNPLPaymentOption from '@/features/bnpl/components/BNPLPaymentOption';
import { createOrder, confirmPayment, failPayment } from '@/features/orders/actions/customer';
import { createRazorpayOrder } from '@/features/payments/actions';

const paymentMethods = [
 { id: 'razorpay', label: 'Pay with Razorpay', desc: 'Credit/Debit card, UPI, Net Banking', icon: CreditCard },
 { id: 'bnpl', label: 'Ethics Pay BNPL', desc: 'Pay in 15 days. Zero interest. ₹5,000 limit', icon: ShieldCheck },
 { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when your food arrives', icon: Banknote },
];

export default function CheckoutPage() {
 const router = useRouter();
 const store = useCartStore();
 const { items, subtotal, deliveryFee, taxAmount, total, clearCart } = store;
 const [paymentMethod, setPaymentMethod] = useState('razorpay');
 const [address, setAddress] = useState('');
 const [city, setCity] = useState('Kolkata');
 const [pincode, setPincode] = useState('');
 const [notes, setNotes] = useState('');
 const [placing, setPlacing] = useState(false);
 const [error, setError] = useState('');

 const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

 if (items.length === 0) {
 return (
 <div className="min-h-screen bg-[#F6F6F6]">
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

async function handlePlaceOrder() {
    setError('');
    if (!address.trim()) { setError('Please enter your delivery address'); return; }
    setPlacing(true);

    const orderResult = await createOrder({
      items,
      subtotal: subtotal(),
      deliveryFee: deliveryFee(),
      taxAmount: taxAmount(),
      total: total(),
      paymentMethod,
      address,
      city,
      pincode,
      notes,
    });

    if (!orderResult.success) {
      setError(orderResult.error ?? 'Failed to place order');
      setPlacing(false);
      return;
    }

    const { orderId, trackingCode } = orderResult.data!;

    if (paymentMethod === 'bnpl') {
      try {
        const result = await processBNPLCheckout(orderId, total());
        if (result.success) {
          await confirmPayment(orderId);
          clearCart();
          router.push(`/order/confirmed?orderId=${orderId}`);
        } else {
          await failPayment(orderId);
          setError(result.error || 'BNPL checkout failed');
          setPlacing(false);
        }
      } catch (err) {
        await failPayment(orderId);
        setError(err instanceof Error ? err.message : 'BNPL checkout failed');
        setPlacing(false);
      }
      return;
    }

    if (paymentMethod === 'razorpay') {
      const loaded = await loadRazorpayScript();
      if (!loaded || !razorpayKey) {
        await failPayment(orderId);
        clearCart();
        router.push(`/order/confirmed?orderId=${orderId}`);
        return;
      }

      const rzpResult = await createRazorpayOrder(total() * 100);
      if (!rzpResult.success) {
        await failPayment(orderId);
        setError(rzpResult.error || 'Failed to initiate payment');
        setPlacing(false);
        return;
      }

      openRazorpayCheckout({
        key: razorpayKey,
        amount: rzpResult.data.amount,
        name: 'Dilipda',
        description: 'Food order',
        orderId: rzpResult.data.id,
        onSuccess: async () => {
          await confirmPayment(orderId);
          clearCart();
          router.push(`/order/confirmed?orderId=${orderId}`);
        },
        onFailure: (err) => {
          failPayment(orderId);
          setError(err);
          setPlacing(false);
        },
      });
      return;
    }

    // COD
    await confirmPayment(orderId);
    clearCart();
    router.push(`/order/confirmed?orderId=${orderId}`);
  }

 return (
 <div className="min-h-screen bg-[#F6F6F6] ">
 <div className="page-pad">
 <div className="container-z mx-auto max-w-4xl">
 <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-ztext-light hover:text-zred mb-4 transition-colors">
 <ArrowLeft size={14} /> Back to bag
 </Link>
 <h1 className="text-2xl font-bold text-ztext mb-6">Checkout</h1>

 <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
 <div className="lg:col-span-3 space-y-5">
 <div className="bg-zcard rounded-xl border border-zborder p-6">
 <h2 className="font-bold text-ztext mb-4 flex items-center gap-2">
  <MapPin size={18} className="text-zred shrink-0" /> Delivery address
 </h2>
 <div className="space-y-4">
 <div>
 <label className="text-xs font-semibold text-ztext uppercase tracking-wide">Street / Area</label>
 <input className="input-z mt-1.5" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Sector V, Salt Lake" />
 </div>
 <div className="flex gap-3">
 <div className="flex-1">
 <label className="text-xs font-semibold text-ztext uppercase tracking-wide">City</label>
 <input className="input-z mt-1.5" value={city} onChange={(e) => setCity(e.target.value)} />
 </div>
 <div className="w-28">
 <label className="text-xs font-semibold text-ztext uppercase tracking-wide">Pincode</label>
 <input className="input-z mt-1.5" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="700091" />
 </div>
 </div>
 </div>
 </div>

 <div className="bg-zcard rounded-xl border border-zborder p-6">
 <h2 className="font-bold text-ztext mb-4 flex items-center gap-2">
  <CreditCard size={18} className="text-zred shrink-0" /> Payment method
 </h2>
 <div className="space-y-3">
 {paymentMethods.map((pm) =>
 pm.id === 'bnpl' ? (
 <BNPLPaymentOption
 key={pm.id}
 selected={paymentMethod === pm.id}
 onSelect={() => setPaymentMethod(pm.id)}
 orderTotal={total()}
 />
 ) : (
 <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
 className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
 paymentMethod === pm.id
  ? 'border-zred bg-red-500/10 shadow-z'
 : 'border-zborder hover:border-ztext-light hover:bg-zgray '
 }`}>
  <pm.icon size={20} className={`mt-0.5 shrink-0 ${paymentMethod === pm.id ? 'text-zred' : 'text-ztext-muted'}`} />
 <div>
 <p className="font-semibold text-ztext text-sm">{pm.label}</p>
 <p className="text-xs text-ztext-light mt-0.5">{pm.desc}</p>
 </div>
 {paymentMethod === pm.id && (
  <span className="ml-auto w-5 h-5 rounded-full bg-zred flex items-center justify-center shrink-0 mt-0.5">
 <span className="w-2 h-2 rounded-full bg-zcard" />
 </span>
 )}
 </button>
 )
 )}
 </div>
 </div>

 <div className="bg-zcard rounded-xl border border-zborder p-6">
 <h2 className="font-bold text-ztext mb-2">Delivery notes (optional)</h2>
 <textarea className="input-z h-20 resize-none mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions for the restaurant..." />
 </div>
 </div>

 <div className="lg:col-span-2">
 <div className="bg-zcard rounded-xl border border-zborder p-6 sticky top-24 shadow-z">
 <h2 className="font-bold text-ztext mb-4 flex items-center gap-2">
  <ShoppingBag size={16} className="text-zred" /> Order summary
 </h2>
 <p className="text-sm text-ztext-light mb-3">Dilipda &bull; {items.length} item{items.length > 1 ? 's' : ''}</p>
 <div className="space-y-2 max-h-36 overflow-y-auto text-sm pr-1">
 {items.map((item) => (
 <div key={item.id} className="flex justify-between">
 <span className="text-ztext truncate mr-2">{item.quantity}x {item.name}</span>
 <span className="font-medium text-ztext shrink-0">₹{item.price * item.quantity}</span>
 </div>
 ))}
 </div>
 <div className="border-t border-zborder mt-4 pt-4 space-y-2 text-sm">
 <div className="flex justify-between text-ztext-light"><span>Subtotal</span><span className="font-medium text-ztext">₹{subtotal()}</span></div>
 <div className="flex justify-between text-ztext-light"><span>Delivery fee</span><span className="font-medium text-ztext">{deliveryFee() > 0 ? `₹${deliveryFee()}` : 'Free'}</span></div>
 <div className="flex justify-between text-ztext-light"><span>Tax</span><span className="font-medium text-ztext">₹{taxAmount()}</span></div>
 <div className="border-t border-zborder pt-3 flex justify-between font-bold text-ztext text-sm"><span>Total</span><span>₹{total()}</span></div>
 </div>
  {error && <p className="text-xs mt-2 flex items-center gap-1 text-zred"><span className="w-1.5 h-1.5 rounded-full bg-zred" />{error}</p>}
 <button onClick={handlePlaceOrder} disabled={placing || !address.trim()} className="button-z button-z-primary w-full mt-5 h-11 text-sm font-bold" style={{ opacity: (!address.trim() && !placing) ? 0.6 : 1 }}>
 {placing ? (
 <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span>
 ) : (
 `Place order • ₹${total()}`
 )}
 </button>
 <p className="text-xs text-ztext-lighter text-center mt-3">By placing this order, you agree to our Terms of Service</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

