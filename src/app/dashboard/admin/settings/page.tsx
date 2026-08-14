'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Save, Loader2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { PageHeader, ToastContainer, useToast, LoadingSkeleton } from '@/components/ui/data-table';
import { getSystemSettings, updateSystemSetting } from '@/features/admin/actions';
import type { SystemSetting } from '@/features/admin/types';

const GATEWAY_OPTIONS = [
  { id: 'none', label: 'None', desc: 'No online gateway — Wallet & Cash on Delivery only' },
  { id: 'razorpay', label: 'Razorpay', desc: 'Cards, UPI, Net Banking via Razorpay' },
  { id: 'phonepe', label: 'PhonePe', desc: 'PhonePe UPI only' },
  { id: 'gpay', label: 'Google Pay', desc: 'GPay UPI only' },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const { toasts, addToast, removeToast } = useToast();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const res = await getSystemSettings();
    if (res.success && res.data) {
      const data = res.data as SystemSetting[];
      setSettings(data);
      const values: Record<string, string> = {};
      data.forEach((s) => { values[s.key] = s.is_secret ? '' : s.value; });
      setEditingValues(values);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (id: string, key: string) => {
    const target = settings.find((s) => s.id === id);
    if (target?.is_secret && !editingValues[key]?.trim()) {
      addToast(`${key.replace(/_/g, ' ')} · leave blank to keep current value`, 'success');
      return;
    }
    setSaving(id);
    const res = await updateSystemSetting(id, editingValues[key] ?? '');
    if (res.success) addToast(`${key.replace(/_/g, ' ')} saved`, 'success');
    else addToast(res.error ?? 'Failed to save', 'error');
    if (res.success) fetchSettings();
    setSaving(null);
  };

  const get = (key: string): SystemSetting | undefined => settings.find((s) => s.key === key);
  const value = (key: string): string => editingValues[key] ?? '';
  const setVal = (key: string, v: string) => setEditingValues((prev) => ({ ...prev, [key]: v }));

  const activeGateway = value('payment_gateway_active') || 'none';

  const setGateway = async (gw: string) => {
    const target = get('payment_gateway_active');
    if (!target) return;
    setVal('payment_gateway_active', gw);
    await handleSave(target.id, 'payment_gateway_active');
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 bg-zgray rounded-lg animate-pulse mb-6" />
        <LoadingSkeleton rows={6} cols={2} />
      </div>
    );
  }

  const input = (setting: SystemSetting | undefined, extraClass = 'w-64') => {
    if (!setting) return null;
    if (setting.is_secret) {
      const isRevealed = revealed[setting.key];
      return (
        <div className="flex items-center gap-2">
          <div className={`relative ${extraClass}`}>
            {!isRevealed && setting.has_value && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none">••••••••</span>
            )}
            <input
              type={isRevealed ? 'text' : 'password'}
              value={editingValues[setting.key] ?? ''}
              onChange={(e) => setVal(setting.key, e.target.value)}
              placeholder={setting.has_value ? 'blank = keep current' : 'Not set'}
              className={`${extraClass} px-3 py-1.5 text-sm border border-zborder rounded-lg focus:outline-none focus:ring-2 focus:ring-zred/20 focus:border-zred pr-9 ${!isRevealed && setting.has_value ? 'text-transparent' : ''}`}
            />
            <button
              type="button"
              onClick={() => setRevealed((prev) => ({ ...prev, [setting.key]: !prev[setting.key] }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ztext-muted hover:text-zred transition-colors"
              aria-label="Toggle visibility"
            >
              {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={() => handleSave(setting.id, setting.key)}
            disabled={saving === setting.id}
            className="p-1.5 hover:bg-zred/10 rounded-lg text-ztext-muted hover:text-zred transition-colors"
          >
            {saving === setting.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          </button>
        </div>
      );
    }
    if (setting.type === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newVal = editingValues[setting.key] === 'true' ? 'false' : 'true';
              setEditingValues((prev) => ({ ...prev, [setting.key]: newVal }));
              handleSave(setting.id, setting.key);
            }}
            className={`relative w-10 h-6 rounded-full transition-colors ${editingValues[setting.key] === 'true' ? 'bg-zred' : 'bg-zsurface'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editingValues[setting.key] === 'true' ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-ztext-lighter w-8">{editingValues[setting.key] === 'true' ? 'On' : 'Off'}</span>
        </div>
      );
    }
    if (setting.type === 'number') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={editingValues[setting.key] ?? ''}
            onChange={(e) => setVal(setting.key, e.target.value)}
            className="w-24 px-3 py-1.5 text-sm border border-zborder rounded-lg focus:outline-none focus:ring-2 focus:ring-zred/20 focus:border-zred text-right"
          />
          <button
            onClick={() => handleSave(setting.id, setting.key)}
            disabled={saving === setting.id}
            className="p-1.5 hover:bg-zred/10 rounded-lg text-ztext-muted hover:text-zred transition-colors"
          >
            {saving === setting.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editingValues[setting.key] ?? ''}
          onChange={(e) => setVal(setting.key, e.target.value)}
          className={`${setting.key === 'store_delivery_locations' ? 'w-96' : 'w-64'} px-3 py-1.5 text-sm border border-zborder rounded-lg focus:outline-none focus:ring-2 focus:ring-zred/20 focus:border-zred`}
        />
        <button
          onClick={() => handleSave(setting.id, setting.key)}
          disabled={saving === setting.id}
          className="p-1.5 hover:bg-zred/10 rounded-lg text-ztext-muted hover:text-zred transition-colors"
        >
          {saving === setting.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        </button>
      </div>
    );
  };

  const row = (key: string) => {
    const setting = get(key);
    if (!setting) return null;
    return (
      <div key={setting.id} className="px-5 py-3.5 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-ztext flex items-center gap-1.5">
              {setting.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              {setting.is_secret && <ShieldAlert size={12} className="text-amber-500" />}
            </p>
            {setting.description && (
              <p className="text-xs text-ztext-lighter mt-0.5">{setting.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">{input(setting)}</div>
        </div>
      </div>
    );
  };

  const group = (title: string, desc: string | null, keys: string[], extra?: React.ReactNode) => (
    <div className="bg-zcard rounded-xl border border-zborder overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zborder flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ztext">{title}</h2>
          {desc && <p className="text-xs text-ztext-lighter mt-0.5">{desc}</p>}
        </div>
        {extra}
      </div>
      <div className="divide-y divide-gray-100">{keys.map(row)}</div>
    </div>
  );

  return (
    <div>
      <PageHeader title="General Settings" description="Credentials, payment gateway, Telegram and owner links">
        <button onClick={fetchSettings} aria-label="Refresh settings" className="p-2.5 rounded-xl hover:bg-zgray text-ztext-lighter transition-colors">
          <RefreshCw size={18} />
        </button>
      </PageHeader>

      <div className="space-y-6">
        {/* Payment gateway selector */}
        <div className="bg-zcard rounded-xl border border-zborder overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zborder">
            <h2 className="text-sm font-semibold text-ztext">Payment Gateway</h2>
            <p className="text-xs text-ztext-lighter mt-0.5">Only one gateway is active at a time. The selected gateway is the only one usable at checkout.</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {GATEWAY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => !saving && setGateway(opt.id)}
                  disabled={saving === get('payment_gateway_active')?.id}
                  className={`text-left px-4 py-3 rounded-xl border transition-all ${
                    activeGateway === opt.id
                      ? 'border-zred bg-red-500/10 shadow-z'
                      : 'border-zborder hover:border-ztext-light hover:bg-zgray'
                  }`}
                >
                  <p className="font-semibold text-xs text-ztext">{opt.label}</p>
                  <p className="text-[10px] text-ztext-light mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
            {activeGateway !== 'none' && (
              <p className="text-[11px] text-ztext-lighter mt-3">Active: <span className="font-bold text-zred uppercase">{activeGateway}</span>. Fill the credentials below for the selected gateway.</p>
            )}
          </div>
        </div>

        {activeGateway === 'razorpay' && group(
          'Razorpay',
          'Razorpay is currently active. Keys used when customers pay via Razorpay.',
          ['razorpay_key_id', 'razorpay_key_secret'],
        )}
        {activeGateway === 'phonepe' && group(
          'PhonePe',
          'PhonePe is currently active. Merchant credentials for PhonePe UPI.',
          ['phonepe_merchant_id', 'phonepe_salt_key', 'phonepe_salt_index'],
        )}
        {activeGateway === 'gpay' && group(
          'Google Pay',
          'GPay is currently active. UPI details for Google Pay.',
          ['gpay_upi_id', 'gpay_upi_name'],
        )}

        {group('Telegram Connection', 'Order notifications delivered to the owner chat', ['telegram_enabled', 'telegram_bot_token', 'telegram_chat_id'])}

        {group('Store & Owner Links', 'Links and details shown across the store (footer, contact, checkout)', [
          'store_support_phone', 'store_support_email', 'store_address', 'store_whatsapp',
          'store_instagram', 'store_facebook', 'store_website', 'store_upi_id', 'store_upi_name',
          'store_hours_open', 'store_hours_close', 'store_order_cutoff_lunch', 'store_order_cutoff_dinner',
          'store_delivery_locations',
        ])}

        {group('Email (SMTP)', 'Used for OTP and order emails. Secrets are stored encrypted.', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'])}

        {group('Pricing', 'Applied to cart at checkout', ['delivery_fee', 'tax_percentage'])}

        {group('Ordering', 'Customer order rules', ['cancellation_window_minutes'])}

        {group('Platform', 'App-wide toggles', ['maintenance_mode'])}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}