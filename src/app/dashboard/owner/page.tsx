'use client';

import { useState, useEffect, useCallback } from 'react';
import { IndianRupee, ShoppingBag, Calendar, Wallet, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/data-table';
import { getOwnerDashboard } from '@/features/owner/actions';
import { usePolling } from '@/hooks/usePolling';

const POLL_INTERVAL_MS = 30_000;

function formatCurrency(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function OwnerOverviewPage() {
  const [stats, setStats] = useState<{
    totalRevenue: number;
    todayRevenue: number;
    monthRevenue: number;
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await getOwnerDashboard();
    if (res.success && res.data) {
      setStats({
        totalRevenue: res.data.total_revenue ?? 0,
        todayRevenue: res.data.today_revenue ?? 0,
        monthRevenue: res.data.monthly_revenue ?? 0,
        totalOrders: res.data.total_orders ?? 0,
        activeOrders: res.data.active_orders ?? 0,
        completedOrders: res.data.completed_orders ?? 0,
      });
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  usePolling(() => { load(true); }, POLL_INTERVAL_MS);

  const cards = [
    { label: 'Total Revenue', value: stats ? formatCurrency(stats.totalRevenue) : '—', icon: Wallet, hint: 'All time' },
    { label: "Today's Revenue", value: stats ? formatCurrency(stats.todayRevenue) : '—', icon: IndianRupee, hint: 'Since midnight' },
    { label: 'This Month', value: stats ? formatCurrency(stats.monthRevenue) : '—', icon: Calendar, hint: 'Monthly revenue' },
    { label: 'Total Orders', value: stats ? stats.totalOrders.toLocaleString('en-IN') : '—', icon: ShoppingBag, hint: `Active: ${stats?.activeOrders ?? 0} · Done: ${stats?.completedOrders ?? 0}` },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Business snapshot at a glance">
        <button onClick={() => load()} aria-label="Refresh" className="p-2.5 rounded-xl hover:bg-zgray text-ztext-lighter transition-colors">
          <RefreshCw size={18} />
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-zcard border border-zborder p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-ztext-lighter">{c.label}</p>
              <c.icon size={16} className="text-ztext-muted" />
            </div>
            <p className="text-xl font-bold text-ztext mt-2">{c.value}</p>
            <p className="text-[10px] text-ztext-lighter mt-1">{c.hint}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div className="mt-6 flex items-center justify-center py-16 text-sm text-ztext-lighter">Loading…</div>
      )}
    </div>
  );
}