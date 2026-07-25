'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../store';
import { authService } from '../services/auth-service';
import { OAuthButtons } from './OAuthButtons';
import { sendSignupOtp, verifySignupOtp } from '@/features/cit-student/actions';
import { showToast } from '@/components/shared/Toast';
import { Loader2, Check, Clock, XCircle, ArrowLeft, Mail, User, Lock } from 'lucide-react';

const COUNTDOWN_SECONDS = 300;

export default function SignupForm() {
  const [step, setStep] = useState<'email' | 'otp' | 'account'>('email');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isCitEmail, setIsCitEmail] = useState(false);
  const timerRef = useRef(0);

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = 0;
  }

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearTimer(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return clearTimer;
  }, [countdown]);

  function formatCountdown(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function handleSendOtp() {
    if (!email.trim() || !email.includes('@')) { showToast('Enter a valid email'); return; }
    setSending(true);
    setDevOtp(null);
    const res = await sendSignupOtp(email);
    setSending(false);
    if (res.success) {
      setStep('otp');
      setCountdown(COUNTDOWN_SECONDS);
      setIsCitEmail(email.toLowerCase().endsWith('@cit.ac.in'));
      showToast('OTP sent to your email');
      if ('devOtp' in res && res.devOtp) setDevOtp(res.devOtp as string);
    } else {
      showToast(res.error ?? 'Failed to send OTP');
    }
  }

  async function handleVerify() {
    if (!otp || otp.length !== 6) { showToast('Enter the 6-digit OTP'); return; }
    setVerifying(true);
    const res = await verifySignupOtp(email, otp);
    setVerifying(false);
    if (res.success) {
      setStep('account');
      showToast('Email verified!');
    } else {
      showToast(res.error ?? 'Verification failed');
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { user, error: err } = await authService.signUp(email, password, fullName);
    setLoading(false);
    if (err) { setError(err); return; }
    if (!user) { setError('Check your email for a confirmation link.'); return; }

    if (isCitEmail) {
      try {
        const supabase = (await import('@/infrastructure/supabase/service')).createServiceClient();
        if (supabase) {
          await supabase.from('profiles').update({
            is_cit_student: true,
            student_email: email.toLowerCase(),
            student_verified_at: new Date().toISOString(),
          }).eq('id', user.id);
        }
      } catch {}
    }

    useAuthStore.getState().setUser(user);
    window.location.href = '/';
  }

  if (step === 'account') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-zcard rounded-xl shadow-z p-8">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setStep('otp')} className="p-1 rounded-lg hover:bg-zgray text-ztext-light transition-colors">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold text-ztext">Create account</h1>
          </div>
          <p className="text-ztext-light text-sm mb-6">
            Email <span className="font-medium text-ztext">{email}</span> verified {isCitEmail && <span className="text-zgreen">✓ CIT</span>}
          </p>

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ztext mb-1.5">Full name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ztext-muted" />
                <input type="text" className="input-z w-full pl-9" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ztext mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ztext-muted" />
                <input type="password" className="input-z w-full pl-9" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
            </div>
            {error && <p className="text-sm text-zred">{error}</p>}
            <button type="submit" className="button-z button-z-primary w-full h-12 text-sm flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-zcard rounded-xl shadow-z p-8">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setStep('email')} className="p-1 rounded-lg hover:bg-zgray text-ztext-light transition-colors">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold text-ztext">Verify your email</h1>
          </div>
          <p className="text-ztext-light text-sm mb-6">
            We sent an OTP to <span className="font-medium text-ztext">{email}</span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ztext mb-1.5">OTP</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="input-z w-full font-mono tracking-widest text-center text-lg"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
              />
            </div>

            <button onClick={handleVerify} disabled={verifying || otp.length !== 6}
              className="button-z button-z-primary w-full h-12 text-sm flex items-center justify-center gap-2"
            >
              {verifying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {verifying ? 'Verifying...' : 'Verify email'}
            </button>

            <div className="flex items-center justify-between">
              {countdown > 0 ? (
                <div className="flex items-center gap-1 text-xs text-ztext-lighter">
                  <Clock size={12} />
                  Resend in {formatCountdown(countdown)}
                </div>
              ) : (
                <button onClick={handleSendOtp} disabled={sending}
                  className="text-xs text-zred hover:underline flex items-center gap-1"
                >
                  {sending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                  Resend OTP
                </button>
              )}
            </div>

            {devOtp && process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-center text-ztext-lighter font-mono mt-2">Dev OTP: {devOtp}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-zcard rounded-xl shadow-z p-8">
        <h1 className="text-2xl font-bold text-ztext mb-1">Create account</h1>
        <p className="text-ztext-light text-sm mb-6">Join Dilip Da and start ordering</p>

        <OAuthButtons />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zborder" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-zcard px-2 text-ztext-lighter">or sign up with email</span></div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ztext mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ztext-muted" />
              <input type="email" className="input-z w-full pl-9" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }} />
            </div>
          </div>
          <button onClick={handleSendOtp} disabled={sending || !email.trim()}
            className="button-z button-z-primary w-full h-12 text-sm flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            {sending ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </div>

        <p className="text-center text-sm text-ztext-light mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-zred">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
