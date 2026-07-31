'use client';

import { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, LogOut, ClipboardList, ChevronRight, Store, Heart, LayoutDashboard, Pencil, X, Check, Loader2, RefreshCw, Users, ShoppingBag, IndianRupee, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/features/auth/store';
import { showToast } from '@/components/shared/Toast';
import { updateServerProfile, getServerAddress, updateServerAddress } from '@/features/auth/actions';
import { getAdminDashboard, getAdminOrders } from '@/features/admin/actions';
import type { DashboardStats, AdminOrder } from '@/features/admin/types';
import { usePolling } from '@/hooks/usePolling';

const POLL_INTERVAL_MS = 30_000;

export default function ProfilePage() {
  const { user, isAuthenticated, signOut, refresh } = useAuthStore();
  const [tab, setTab] = useState<'profile' | 'dashboard'>('profile');

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [address, setAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(true);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [dashLoading, setDashLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadAddress();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (tab === 'dashboard' && isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
      fetchDashboardData();
    }
  }, [tab, isAuthenticated, user?.role]);

  async function loadAddress() {
    setAddressLoading(true);
    const result = await getServerAddress();
    if (result.address) {
      setAddress(result.address.full_address || '');
    }
    setAddressLoading(false);
  }

  async function fetchDashboardData(silent = false) {
    if (!silent) setDashLoading(true);
    const [statsRes, ordersRes] = await Promise.all([
      getAdminDashboard(),
      getAdminOrders({ page: 1, pageSize: 10, sortBy: 'created_at', sortOrder: 'desc' }),
    ]);
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    if (ordersRes.success && ordersRes.data) setRecentOrders(ordersRes.data.data as AdminOrder[]);
    if (!silent) setDashLoading(false);
  }

  usePolling(
    () => { fetchDashboardData(true); },
    POLL_INTERVAL_MS,
    tab === 'dashboard' && isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin'),
  );

  function startEdit(field: string, currentValue: string) {
    setEditingField(field);
    setEditValue(currentValue);
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue('');
  }

  async function handleSave() {
    if (!editingField || !editValue.trim()) return;
    setSaving(true);

    if (editingField === 'name') {
      const result = await updateServerProfile({ full_name: editValue });
      if (result.error) {
        showToast(result.error);
      } else {
        await refresh();
        showToast('Name updated');
      }
    } else if (editingField === 'phone') {
      const result = await updateServerProfile({ phone: editValue });
      if (result.error) {
        showToast(result.error);
      } else {
        await refresh();
        showToast('Phone updated');
      }
    } else if (editingField === 'address') {
      const formData = new FormData();
      formData.set('fullAddress', editValue);
      const result = await updateServerAddress(formData);
      if (result.error) {
        showToast(result.error);
      } else {
        setAddress(editValue);
        showToast('Address updated');
      }
    }

    setSaving(false);
    setEditingField(null);
    setEditValue('');
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="page-pad">
        <div className="container-z mx-auto max-w-lg text-center py-16">
          <div className="w-20 h-20 rounded-full bg-zgray flex items-center justify-center mx-auto">
            <User size={36} className="text-ztext-muted" />
          </div>
          <h1 className="text-xl font-bold text-ztext mt-5">Welcome to Dilip Da</h1>
          <p className="text-sm text-ztext-light mt-2">
            Sign in to manage your profile, view orders, and save your delivery address.
          </p>
          <Link href="/auth/login" className="button-z button-z-primary mt-6">
            Sign in
          </Link>
          <Link href="/auth/signup" className="button-z button-z-outline mt-3">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const initials = (user.fullName || user.email || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  function renderEditActions() {
    if (saving) {
      return <Loader2 size={16} className="animate-spin text-ztext-muted shrink-0" />;
    }
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={handleSave} className="size-7 grid place-items-center rounded-md hover:bg-zgreen/10 text-zgreen transition-colors">
          <Check size={15} />
        </button>
        <button onClick={cancelEdit} className="size-7 grid place-items-center rounded-md hover:bg-zred/10 text-zred transition-colors">
          <X size={15} />
        </button>
      </div>
    );
  }

  const fmt = (n: number) => '₹' + Number(n).toLocaleString('en-IN');

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400', accepted: 'bg-blue-500/10 text-blue-400',
    preparing: 'bg-indigo-500/10 text-indigo-400', ready: 'bg-green-500/10 text-green-400',
    assigned: 'bg-purple-500/10 text-purple-400', out_for_delivery: 'bg-orange-500/10 text-orange-400',
    delivered: 'bg-emerald-500/10 text-emerald-400', completed: 'bg-emerald-500/10 text-emerald-400',
    cancelled: 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="page-pad">
      <div className="container-z mx-auto max-w-lg">
        {/* Tab navigation */}
        <div className="flex items-center gap-1 mb-5 bg-zcard rounded-xl border border-zborder p-1">
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'profile' ? 'bg-zred/10 text-zred shadow-z' : 'text-ztext-light hover:text-ztext'
            }`}
          >
            <User size={16} />
            Profile
          </button>
          {isAdmin && (
            <button
              onClick={() => setTab('dashboard')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'dashboard' ? 'bg-zred/10 text-zred shadow-z' : 'text-ztext-light hover:text-ztext'
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
          )}
        </div>

        {tab === 'profile' ? (
          <>
            {/* User card */}
            <div className="bg-zcard rounded-xl border border-zborder p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-zred/15 flex items-center justify-center text-zred font-bold text-lg shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ztext text-sm truncate">
                  {user.fullName || 'Dilip Da Customer'}
                </p>
                <p className="text-xs text-ztext-light truncate">{user.email}</p>
              </div>
            </div>

            {/* Settings list */}
            <div className="mt-4 bg-zcard rounded-xl border border-zborder divide-y divide-zborder">
              {/* Name */}
              <div className="p-4 flex items-center gap-3">
                <User size={18} className="text-zred shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ztext text-sm">Name</p>
                  {editingField === 'name' ? (
                    <input
                      className="input-z mt-1 text-sm"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit(); }}
                    />
                  ) : (
                    <p className="text-xs text-ztext-light mt-0.5 truncate">{user.fullName || 'Not set'}</p>
                  )}
                </div>
                {editingField === 'name' ? renderEditActions() : (
                  <button onClick={() => startEdit('name', user.fullName || '')} className="size-7 grid place-items-center rounded-md hover:bg-zgray text-ztext-muted transition-colors shrink-0">
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              {/* Phone */}
              <div className="p-4 flex items-center gap-3">
                <Phone size={18} className="text-zred shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ztext text-sm">Phone</p>
                  {editingField === 'phone' ? (
                    <input
                      className="input-z mt-1 text-sm"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit(); }}
                    />
                  ) : (
                    <p className="text-xs text-ztext-light mt-0.5">{user.phone || 'Not set'}</p>
                  )}
                </div>
                {editingField === 'phone' ? renderEditActions() : (
                  <button onClick={() => startEdit('phone', user.phone || '')} className="size-7 grid place-items-center rounded-md hover:bg-zgray text-ztext-muted transition-colors shrink-0">
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              {/* Delivery address */}
              <div className="p-4 flex items-start gap-3">
                <MapPin size={18} className="text-zred shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ztext text-sm">Delivery address</p>
                  {editingField === 'address' ? (
                    <textarea
                      className="input-z mt-1 text-sm resize-none h-20"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <p className="text-xs text-ztext-light mt-0.5">
                      {addressLoading ? (
                        <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading...</span>
                      ) : (
                        address || 'No address saved'
                      )}
                    </p>
                  )}
                </div>
                {editingField === 'address' ? renderEditActions() : (
                  <button onClick={() => startEdit('address', address)} className="size-7 grid place-items-center rounded-md hover:bg-zgray text-ztext-muted transition-colors shrink-0 mt-0.5">
                    <Pencil size={14} />
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="p-4 flex items-center gap-3">
                <Mail size={18} className="text-zred shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ztext text-sm">Email</p>
                  <p className="text-xs text-ztext-light mt-0.5 truncate">{user.email}</p>
                </div>
              </div>

              {/* Wallet balance — disabled
              <div className="p-4 flex items-center gap-3">
                <Wallet size={18} className="text-zred shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ztext text-sm">Wallet</p>
                  <p className="text-xs text-ztext-light mt-0.5">
                    {walletBalance !== null ? `₹${walletBalance.toLocaleString('en-IN')}` : 'Loading...'}
                  </p>
                </div>
              </div>
              */}

              {/* Orders link */}
              <Link href="/orders" className="p-4 flex items-center gap-3 hover:bg-zgray transition-colors">
                <ClipboardList size={18} className="text-zred shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-ztext text-sm">My Orders</p>
                  <p className="text-xs text-ztext-light mt-0.5">View order history</p>
                </div>
                <ChevronRight size={16} className="text-ztext-muted shrink-0" />
              </Link>

              {/* Favorites link (Desktop only) */}
              <Link href="/favorites" className="hidden sm:flex p-4 items-center gap-3 hover:bg-zgray transition-colors">
                <Heart size={18} className="text-zred shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-ztext text-sm">Favorites</p>
                  <p className="text-xs text-ztext-light mt-0.5">Your saved dishes</p>
                </div>
                <ChevronRight size={16} className="text-ztext-muted shrink-0" />
              </Link>

              {/* Theme toggle — moved to Navbar */}
            </div>

            {/* About section */}
            <div className="mt-4 bg-zcard rounded-xl border border-zborder p-5">
              <h2 className="text-sm font-bold text-ztext mb-2 flex items-center gap-2">
                <Store size={18} className="text-zred" /> About Dilip Da
              </h2>
              <p className="text-xs text-ztext-light leading-relaxed">
                Homestyle Bengali food service near CIT Kokrajhar&apos;s 2nd gate.
                Fresh, authentic meals cooked with love — from classic fish curry to evening chai.
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-ztext-light">
                  <MapPin size={14} className="text-ztext-muted" /> Near CIT Kokrajhar, 2nd Gate
                </div>
                <div className="flex items-center gap-2 text-xs text-ztext-light">
                  <Phone size={14} className="text-ztext-muted" /> 6000212823
                </div>
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={signOut}
              className="mt-4 w-full bg-zcard rounded-xl border border-zborder p-4 flex items-center gap-3 hover:bg-red-500/5 transition-colors"
            >
              <LogOut size={18} className="text-zred shrink-0" />
              <span className="font-semibold text-zred text-sm">Sign out</span>
            </button>
          </>
        ) : (
          /* Dashboard tab */
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-bold text-ztext">Dashboard</h1>
                <p className="text-xs text-ztext-light">Platform overview</p>
              </div>
              <button onClick={() => fetchDashboardData()} className="p-2 rounded-xl hover:bg-zgray text-ztext-lighter transition-colors" aria-label="Refresh">
                <RefreshCw size={16} />
              </button>
            </div>

            {dashLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="grid gap-3 grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-zcard rounded-xl shadow-z p-4">
                      <div className="h-3 w-16 bg-zsurface rounded mb-3" />
                      <div className="h-7 w-12 bg-zsurface rounded mb-1" />
                      <div className="h-3 w-20 bg-zsurface rounded" />
                    </div>
                  ))}
                </div>
                <div className="bg-zcard rounded-xl border border-zborder p-4">
                  <div className="h-4 w-20 bg-zsurface rounded mb-3" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 bg-zsurface rounded mb-2" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3 grid-cols-2 mb-4">
                  {[
                    { label: 'Users', value: stats?.total_users ?? 0, icon: Users },
                    { label: 'Orders', value: stats?.total_orders ?? 0, icon: ShoppingBag },
                    { label: 'Revenue', value: fmt(stats?.total_revenue ?? 0), icon: IndianRupee },
                    // { label: 'BNPL', value: fmt(stats?.bnpl_outstanding ?? 0), icon: Wallet },
                  ].map((card) => (
                    <div key={card.label} className="bg-zcard rounded-xl shadow-z p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-ztext-lighter uppercase tracking-wider">{card.label}</p>
                        <card.icon size={14} className="text-ztext-muted" />
                      </div>
                      <p className="text-lg font-bold text-ztext">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 grid-cols-2 mb-4">
                  {[
                    { label: "Today's Revenue", value: fmt(stats?.today_revenue ?? 0) },
                    { label: 'Active Orders', value: stats?.active_orders ?? 0 },
                    { label: 'Pending Approvals', value: stats?.pending_merchant_approvals ?? 0 },
                    { label: 'Overdue', value: stats?.total_overdue_accounts ?? 0 },
                  ].map((card) => (
                    <div key={card.label} className="bg-zcard rounded-xl shadow-z p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zred/10 flex items-center justify-center shrink-0">
                        {card.label === "Today's Revenue" ? <TrendingUp size={14} className="text-zred" /> :
                         card.label === 'Active Orders' ? <Clock size={14} className="text-zred" /> :
                         <AlertTriangle size={14} className="text-zred" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ztext">{card.value}</p>
                        <p className="text-[10px] text-ztext-light truncate">{card.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-zcard rounded-xl border border-zborder">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zborder">
                    <h2 className="text-xs font-bold text-ztext">Recent Orders</h2>
                    <Link href="/dashboard/admin/orders" className="text-[10px] font-medium text-zred hover:underline">View all</Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zborder text-ztext-lighter">
                          <th className="text-left px-4 py-2.5 font-medium">Tracking</th>
                          <th className="text-left px-4 py-2.5 font-medium">Customer</th>
                          <th className="text-left px-4 py-2.5 font-medium">Total</th>
                          <th className="text-left px-4 py-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-6 text-center text-ztext-lighter">No orders yet</td></tr>
                        ) : recentOrders.map((order) => (
                          <tr key={order.id} className="border-b border-zborder last:border-0">
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-[11px] font-medium text-ztext">{order.tracking_code}</span>
                            </td>
                            <td className="px-4 py-2.5 text-ztext-light">{order.user?.full_name ?? order.customer_name ?? 'Guest'}</td>
                            <td className="px-4 py-2.5 font-medium text-ztext">{fmt(Number(order.total))}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors[order.status] ?? 'bg-zgray text-ztext-light'}`}>
                                {order.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
