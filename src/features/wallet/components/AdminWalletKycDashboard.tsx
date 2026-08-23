'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle, XCircle, Search, Eye, AlertCircle, RefreshCw, X, Filter } from 'lucide-react';
import { getAllWallets, approveWalletKyc, rejectWalletKyc, updateWalletStatus } from '../actions';
import type { Wallet } from '../types';

export default function AdminWalletKycDashboard() {
  const [kycs, setKycs] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Modal State
  const [selectedKyc, setSelectedKyc] = useState<Wallet | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const fetchKycs = async () => {
    setLoading(true);
    const res = await getAllWallets();
    if (res.success && res.data) {
      setKycs(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKycs();
  }, []);

  const handleApprove = async () => {
    if (!selectedKyc) return;
    setProcessing(true);
    setError('');
    
    const res = await approveWalletKyc(selectedKyc.id);
    if (res.success) {
      setSelectedKyc(null);
      fetchKycs();
    } else {
      setError(res.error || 'Failed to approve KYC');
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedKyc) return;
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection or deactivation.');
      return;
    }
    setProcessing(true);
    setError('');
    
    const res = await rejectWalletKyc(selectedKyc.id, rejectReason.trim());
    if (res.success) {
      setSelectedKyc(null);
      setRejectReason('');
      fetchKycs();
    } else {
      setError(res.error || 'Failed to reject KYC');
    }
    setProcessing(false);
  };

  const handleDeactivate = async () => {
    if (!selectedKyc) return;
    setProcessing(true);
    setError('');
    
    const res = await updateWalletStatus(selectedKyc.id, 'rejected');
    if (res.success) {
      setSelectedKyc(null);
      fetchKycs();
    } else {
      setError(res.error || 'Failed to deactivate wallet');
    }
    setProcessing(false);
  };

  const filteredKycs = kycs.filter((k) => {
    const matchesSearch = k.kyc_name?.toLowerCase().includes(search.toLowerCase()) || k.kyc_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' ? true : k.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = kycs.filter(k => k.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ztext flex items-center gap-2">
            <ShieldCheck className="text-amber-500" /> Wallet Management
          </h1>
          <p className="text-sm text-ztext-light mt-1">Review KYCs and manage active wallets.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ztext-muted" />
            <input
              type="text"
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-z pl-9 text-sm w-full sm:w-64"
            />
          </div>
          <button 
            onClick={fetchKycs}
            className="p-2.5 bg-zgray text-ztext border border-zborder rounded-xl hover:bg-zcard transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-zcard border border-zborder rounded-xl w-fit">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'all' ? 'bg-zgray text-ztext' : 'text-ztext-light hover:text-ztext'}`}
        >
          All Wallets
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'text-ztext-light hover:text-ztext'}`}
        >
          Active
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${filterStatus === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'text-ztext-light hover:text-ztext'}`}
        >
          Pending {pendingCount > 0 && <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px]">{pendingCount}</span>}
        </button>
        <button
          onClick={() => setFilterStatus('rejected')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterStatus === 'rejected' ? 'bg-red-500/10 text-red-500' : 'text-ztext-light hover:text-ztext'}`}
        >
          Rejected / Deactivated
        </button>
      </div>

      <div className="bg-zcard border border-zborder rounded-2xl overflow-hidden shadow-z">
        {loading ? (
          <div className="p-12 text-center text-ztext-light">Loading wallets...</div>
        ) : filteredKycs.length === 0 ? (
          <div className="p-12 text-center text-ztext-light">
            <Filter size={48} className="mx-auto mb-4 text-ztext-muted" />
            <p className="font-semibold">No wallets found</p>
            <p className="text-xs">Try changing your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zgray text-ztext-lighter text-xs uppercase font-bold border-b border-zborder">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zborder">
                {filteredKycs.map((kyc) => (
                  <tr key={kyc.id} className="hover:bg-zgray/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-ztext">{kyc.kyc_name || 'N/A'}</div>
                      <div className="text-xs text-ztext-light mt-0.5">{kyc.kyc_email || 'No email provided'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        kyc.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                        kyc.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                        kyc.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                        'bg-zgray border border-zborder text-ztext-muted'
                      }`}>
                        {kyc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-ztext-light">
                      {kyc.kyc_submitted_at ? new Date(kyc.kyc_submitted_at).toLocaleString('en-IN') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setSelectedKyc(kyc); setRejectReason(''); setError(''); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zgray text-ztext border border-zborder rounded-lg text-xs font-bold hover:bg-zcard hover:border-ztext-muted transition-colors"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zcard border border-zborder rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-zborder mb-4">
              <h2 className="text-lg font-bold text-ztext flex items-center gap-2">
                Wallet Details: {selectedKyc.kyc_name || 'User'}
                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        selectedKyc.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                        selectedKyc.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {selectedKyc.status}
                </span>
              </h2>
              <button 
                onClick={() => setSelectedKyc(null)}
                className="p-1.5 rounded-lg hover:bg-zgray text-ztext-lighter hover:text-ztext transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 bg-zgray/30 p-4 rounded-xl border border-zborder text-sm">
              <div>
                <p className="text-xs font-bold text-ztext-light mb-1">KYC Email</p>
                <p className="font-medium">{selectedKyc.kyc_email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-ztext-light mb-1">Document Type</p>
                <p className="font-medium">{selectedKyc.document_type || 'N/A'}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-semibold text-ztext-lighter mb-2">Live Photo / Selfie</label>
                {selectedKyc.kyc_photo_url ? (
                  <img src={selectedKyc.kyc_photo_url} alt="Selfie" className="w-full h-48 object-cover rounded-xl border border-zborder bg-zgray" />
                ) : (
                  <div className="w-full h-48 bg-zgray rounded-xl border border-zborder flex items-center justify-center text-xs text-ztext-muted">No Image</div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-ztext-lighter mb-2">Document Proof</label>
                {selectedKyc.pan_card_url ? (
                  <img src={selectedKyc.pan_card_url} alt="ID Document" className="w-full h-48 object-contain rounded-xl border border-zborder bg-zgray" />
                ) : (
                  <div className="w-full h-48 bg-zgray rounded-xl border border-zborder flex items-center justify-center text-xs text-ztext-muted">No Document</div>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {selectedKyc.status === 'active' ? (
              <div className="flex flex-col gap-3">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-500">Deactivate Wallet</h3>
                    <p className="text-xs text-ztext-light mt-1">If you deactivate this wallet, the user will no longer be able to use their balance until re-approved.</p>
                  </div>
                </div>
                <button
                  onClick={handleDeactivate}
                  disabled={processing}
                  className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> Deactivate Wallet
                </button>
              </div>
            ) : (
              <>
                <div className="bg-zgray/50 border border-zborder rounded-xl p-4 mb-6">
                  <label className="block text-xs font-semibold text-ztext-lighter mb-2">Rejection Reason (Optional for Approve)</label>
                  <input
                    type="text"
                    placeholder="Required if rejecting (e.g., blurry photo, name mismatch)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="input-z w-full text-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReject}
                    disabled={processing}
                    className="flex-1 py-3 bg-zgray border border-red-500/30 text-red-400 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} /> Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle size={18} /> {selectedKyc.status === 'rejected' ? 'Re-Approve KYC' : 'Approve KYC'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
