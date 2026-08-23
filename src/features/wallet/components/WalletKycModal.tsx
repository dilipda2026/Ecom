'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle, RefreshCw, X, AlertCircle } from 'lucide-react';
import { submitWalletKyc } from '../actions';
import { showToast } from '@/components/shared/Toast';
import type { Wallet } from '../types';

interface WalletKycModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletStatus: string;
  wallet: Wallet | null;
  onSuccess: () => void;
  defaultName?: string;
  defaultEmail?: string;
}

export default function WalletKycModal({ isOpen, onClose, walletStatus, wallet, onSuccess, defaultName = '', defaultEmail = '' }: WalletKycModalProps) {
  const router = useRouter();
  
  const [kycName, setKycName] = useState(defaultName);
  const [kycEmail, setKycEmail] = useState(defaultEmail);
  const [documentType, setDocumentType] = useState('Aadhar Card');
  const [kycPhotoFile, setKycPhotoFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [kycError, setKycError] = useState('');

  if (!isOpen) return null;

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycError('');
    if (!kycName.trim() || !kycEmail.trim() || !kycPhotoFile || !documentFile) {
      setKycError('Please fill all fields and upload both documents.');
      return;
    }
    setSubmittingKyc(true);
    try {
      const photoFormData = new FormData();
      photoFormData.append('file', kycPhotoFile);
      photoFormData.append('category', 'kyc');
      const photoRes = await fetch('/api/upload', { method: 'POST', body: photoFormData });
      const photoData = await photoRes.json();
      if (!photoData.success) throw new Error(photoData.error || 'Failed to upload photo');

      const docFormData = new FormData();
      docFormData.append('file', documentFile);
      docFormData.append('category', 'kyc');
      const docRes = await fetch('/api/upload', { method: 'POST', body: docFormData });
      const docData = await docRes.json();
      if (!docData.success) throw new Error(docData.error || 'Failed to upload document');

      const submitRes = await submitWalletKyc({
        kycName: kycName.trim(),
        kycEmail: kycEmail.trim(),
        documentType,
        kycPhotoUrl: photoData.url,
        panCardUrl: docData.url,
      });

      if (submitRes.success) {
        showToast('KYC Submitted Successfully! Please wait for admin approval.');
        onSuccess();
      } else {
        setKycError(submitRes.error || 'Failed to submit KYC.');
      }
    } catch (err: any) {
      setKycError(err.message || 'An unexpected error occurred during KYC upload.');
    } finally {
      setSubmittingKyc(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zcard border border-zborder rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-z-modal animate-scale-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3.5 border-b border-zborder mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zred/10 border border-zred/20 flex items-center justify-center text-zred">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="font-bold text-ztext text-sm sm:text-base">Wallet Activation (KYC)</h3>
              <p className="text-[11px] text-ztext-lighter">Required to unlock wallet features</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zgray text-ztext-lighter hover:text-ztext transition-colors">
            <X size={18} />
          </button>
        </div>

        {walletStatus === 'pending' ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <RefreshCw size={32} className="animate-spin" />
            </div>
            <h2 className="text-lg font-black text-ztext mb-2">KYC Under Review</h2>
            <p className="text-sm text-ztext-light">
              Your wallet activation request is currently pending. Our team is reviewing your documents. Please check back later.
            </p>
            <button onClick={onClose} className="mt-6 px-6 py-2 bg-zgray border border-zborder rounded-xl text-sm font-semibold hover:bg-zcard transition-colors">
              Got it
            </button>
          </div>
        ) : (
          <form onSubmit={handleKycSubmit} className="space-y-4">
            {walletStatus === 'rejected' && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">Your previous KYC was rejected</p>
                  <p className="text-[10px] mt-0.5">{wallet?.kyc_rejection_reason || 'Invalid documents provided.'}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-ztext-lighter mb-1.5">Full Name (As per Document)</label>
              <input
                type="text"
                value={kycName}
                onChange={(e) => setKycName(e.target.value)}
                className="input-z w-full text-sm"
                placeholder="e.g. Rahul Kumar"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ztext-lighter mb-1.5">Email Address</label>
              <input
                type="email"
                value={kycEmail}
                onChange={(e) => setKycEmail(e.target.value)}
                className="input-z w-full text-sm"
                placeholder="e.g. rahul@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ztext-lighter mb-1.5">Live Photo / Selfie (Image)</label>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => setKycPhotoFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-ztext-light file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-zred/10 file:text-zred hover:file:bg-zred/20 cursor-pointer border border-zborder rounded-xl p-1.5 bg-zgray/50"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ztext-lighter mb-1.5">Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="input-z w-full text-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:10px_10px] bg-[right_12px_center]"
              >
                <option value="Aadhar Card">Aadhar Card</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Voter ID Card">Voter ID Card</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ztext-lighter mb-1.5">{documentType} Document (Image)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-ztext-light file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-zgray file:text-ztext hover:file:bg-zborder cursor-pointer border border-zborder rounded-xl p-1.5 bg-zgray/50"
                required
              />
            </div>

            {kycError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{kycError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingKyc}
              className="w-full mt-2 py-3 bg-zred text-white rounded-xl text-sm font-bold hover:bg-zred-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submittingKyc ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {submittingKyc ? 'Uploading & Submitting...' : 'Submit KYC'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
