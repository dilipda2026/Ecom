'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  CreditCard, Phone, Send, Mail, IndianRupee, SlidersHorizontal,
  RefreshCw, Loader2, Eye, EyeOff, Copy, ShieldAlert, Save,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader, ToastContainer, useToast, LoadingSkeleton } from '@/components/ui/data-table';
import { getSystemSettings, updateSystemSetting } from '@/features/admin/actions';
import type { SystemSetting } from '@/features/admin/types';

const LABELS: Record<string, string> = {
  payment_method_wallet_enabled: 'Wallet',
  payment_method_razorpay_enabled: 'Razorpay',
  payment_method_phonepe_enabled: 'PhonePe',
  payment_method_gpay_enabled: 'Google Pay',
  payment_method_cod_enabled: 'Cash on Delivery',
};

const inputClass = 'w-full bg-zgray border border-zborder rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zred/20 focus:border-zred';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const { toasts, addToast, removeToast } = useToast();

  const fetchSettings = useCallback(async () => {
    const res = await getSystemSettings();
    if (res.success && res.data) {
      const data = res.data as SystemSetting[];
      setSettings(data);
      const values: Record<string, string> = {};
      data.forEach((s) => { values[s.key] = s.is_secret ? '' : s.value; });
      setEditingValues(values);
      setOriginalValues({ ...values });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = (s: SystemSetting): boolean => {
    const cur = editingValues[s.key] ?? '';
    if (s.is_secret) return cur.trim() !== '';
    return cur !== (originalValues[s.key] ?? s.value);
  };

  const handleSave = async () => {
    const dirty = settings.filter(isDirty);
    if (dirty.length === 0) {
      addToast('No changes to save', 'info');
      return;
    }
    for (const s of dirty) {
      if (s.type === 'json') {
        const val = editingValues[s.key] ?? '';
        if (!val.trim()) {
          addToast(`${s.key.replace(/_/g, ' ')} · empty value not allowed`, 'error');
          return;
        }
        try {
          JSON.parse(val);
        } catch {
          addToast(`${s.key.replace(/_/g, ' ')} · invalid JSON`, 'error');
          return;
        }
      }
    }
    setSaving(true);
    const errors: string[] = [];
    for (const s of dirty) {
      const res = await updateSystemSetting(s.id, editingValues[s.key] ?? '');
      if (!res.success) errors.push(res.error ?? s.key);
    }
    setSaving(false);
    if (errors.length) {
      addToast(`Saved ${dirty.length - errors.length}/${dirty.length} · ${errors.join('; ')}`, 'error');
    } else {
      addToast(`Saved ${dirty.length} change${dirty.length > 1 ? 's' : ''}`, 'success');
    }
    fetchSettings();
  };

  const get = (key: string): SystemSetting | undefined => settings.find((s) => s.key === key);
  const setVal = (key: string, v: string) => setEditingValues((prev) => ({ ...prev, [key]: v }));

  const handleCopy = (key: string) => {
    const v = editingValues[key] ?? '';
    if (!v.trim()) return;
    navigator.clipboard?.writeText(v).then(() => addToast('Copied to clipboard', 'success')).catch(() => {});
  };

  const isEnabled = (key: string) => editingValues[key] === 'true';
  const paymentCredentialKeys = [
    ...(isEnabled('payment_method_razorpay_enabled') ? ['razorpay_key_id', 'razorpay_key_secret'] : []),
    ...(isEnabled('payment_method_phonepe_enabled') ? ['phonepe_merchant_id', 'phonepe_salt_key', 'phonepe_salt_index'] : []),
    ...(isEnabled('payment_method_gpay_enabled') ? ['gpay_upi_id', 'gpay_upi_name'] : []),
    'store_upi_id', 'store_upi_name',
  ];

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 bg-zgray rounded-lg animate-pulse mb-6" />
        <LoadingSkeleton rows={6} cols={2} />
      </div>
    );
  }

  const renderField = (settingKey: string) => {
    const setting = get(settingKey);
    if (!setting) return null;
    const label = LABELS[setting.key] ?? setting.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const isSecret = setting.is_secret;
    const isRevealed = revealed[setting.key];
    const val = editingValues[setting.key] ?? '';
    const disabled = saving;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <label className="block text-sm font-semibold text-ztext">
            {label}
            {isSecret && <ShieldAlert size={11} className="inline text-amber-500 ml-1" />}
          </label>
          {setting.description && <span className="text-xs text-ztext-lighter">{setting.description}</span>}
        </div>

        <div className="w-full sm:w-64 flex items-center justify-end shrink-0">
          {setting.type === 'boolean' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ztext-lighter w-8">{val === 'true' ? 'On' : 'Off'}</span>
              <button
                type="button"
                role="switch"
                aria-checked={val === 'true'}
                disabled={disabled}
                onClick={() => {
                  const newVal = val === 'true' ? 'false' : 'true';
                  setVal(setting.key, newVal);
                }}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${val === 'true' ? 'bg-zred' : 'bg-zsurface'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${val === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ) : isSecret ? (
            <div className="relative w-full">
              {!isRevealed && setting.has_value && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none">••••••••</span>
              )}
              <input
                type={isRevealed ? 'text' : 'password'}
                value={val}
                disabled={disabled}
                onChange={(e) => setVal(setting.key, e.target.value)}
                placeholder={setting.has_value ? 'blank = keep current' : 'Not set'}
                className={`${inputClass} pl-3 pr-16 ${!isRevealed && setting.has_value ? 'text-transparent' : ''}`}
              />
              <div className="absolute right-2 flex items-center gap-1 text-ztext-lighter">
                <button type="button" onClick={() => setRevealed((prev) => ({ ...prev, [setting.key]: !prev[setting.key] }))} className="p-1 hover:text-ztext transition-colors" aria-label="Toggle visibility">
                  {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button type="button" onClick={() => handleCopy(setting.key)} className="p-1 hover:text-ztext transition-colors" aria-label="Copy">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : setting.type === 'number' ? (
            <input
              type="number"
              value={val}
              disabled={disabled}
              onChange={(e) => setVal(setting.key, e.target.value)}
              className={`${inputClass} text-right`}
            />
          ) : setting.key === 'store_address' || setting.key === 'store_delivery_locations' ? (
            <textarea
              rows={3}
              value={val}
              disabled={disabled}
              onChange={(e) => setVal(setting.key, e.target.value)}
              className={`${inputClass} resize-none`}
            />
          ) : (
            <input
              type="text"
              value={val}
              disabled={disabled}
              onChange={(e) => setVal(setting.key, e.target.value)}
              className={inputClass}
            />
          )}
        </div>
      </div>
    );
  };

  const sectionToggle = (key: string, on: boolean) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        const newVal = on ? 'false' : 'true';
        setVal(key, newVal);
      }}
      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${on ? 'bg-zred' : 'bg-zsurface'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );

  const renderCard = ({ icon: Icon, title, subtitle, keys, toggleKey }: { icon: LucideIcon; title: string; subtitle: string; keys: string[]; toggleKey?: string }) => {
    const enabled = toggleKey ? (editingValues[toggleKey] ?? 'true') !== 'false' : true;

    if (toggleKey && !enabled) {
      return (
        <div className="bg-zcard/60 rounded-2xl border border-zborder/60 px-4 py-3">
          <div className="flex items-center gap-3">
            {sectionToggle(toggleKey, false)}
            <p className="text-sm font-semibold text-ztext-lighter">{title}</p>
            <span className="ml-auto text-[10px] uppercase tracking-wide text-ztext-lighter">Hidden</span>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-zcard rounded-2xl p-6 border border-zborder shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-zborder mb-5">
          {toggleKey && sectionToggle(toggleKey, true)}
          <div className="p-2.5 bg-zsurface rounded-xl text-ztext-lighter">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ztext">{title}</h2>
            <p className="text-xs text-ztext-lighter">{subtitle}</p>
          </div>
        </div>
        <div className="space-y-4">
          {keys.map((k) => <Fragment key={k}>{renderField(k)}</Fragment>)}
        </div>
      </div>
    );
  };

  const dirtyCount = settings.filter(isDirty).length;

  return (
    <div>
      <PageHeader title="General Settings" description="Payment methods, credentials, telegram, owner links and SMTP">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="button-z button-z-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {dirtyCount > 0 ? `Save Changes (${dirtyCount})` : 'Save Changes'}
        </button>
        <button onClick={() => { setLoading(true); fetchSettings(); }} aria-label="Refresh settings" className="p-2.5 rounded-xl hover:bg-zgray text-ztext-lighter transition-colors">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCard({
          icon: CreditCard,
          title: 'Payment Methods',
          subtitle: 'Choose which methods customers can use at checkout. A method is shown only when enabled and configured.',
          keys: [
            'payment_method_wallet_enabled',
            'payment_method_razorpay_enabled',
            'payment_method_phonepe_enabled',
            'payment_method_gpay_enabled',
            'payment_method_cod_enabled',
          ],
        })}

        {renderCard({
          icon: CreditCard,
          title: 'Payments',
          subtitle: 'Credentials for the enabled methods. Secrets are stored encrypted and never shown.',
          keys: paymentCredentialKeys,
        })}

        {renderCard({
          icon: Phone,
          title: 'Contact',
          subtitle: 'Links and details shown across the store (footer, contact, checkout).',
          toggleKey: 'contact_enabled',
          keys: [
            'store_support_phone', 'store_support_email', 'store_address',
            'store_whatsapp', 'store_instagram', 'store_facebook', 'store_website',
          ],
        })}

        {renderCard({
          icon: Send,
          title: 'Telegram',
          subtitle: 'Order notifications delivered to the owner chat.',
          toggleKey: 'telegram_enabled',
          keys: ['telegram_bot_token', 'telegram_chat_id'],
        })}

        {renderCard({
          icon: Mail,
          title: 'SMTP / Email',
          subtitle: 'Used for OTP and order emails. Secrets are stored encrypted.',
          toggleKey: 'smtp_enabled',
          keys: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'],
        })}

        {renderCard({
          icon: IndianRupee,
          title: 'Pricing',
          subtitle: 'Applied to cart at checkout.',
          toggleKey: 'pricing_enabled',
          keys: ['delivery_fee', 'tax_percentage'],
        })}

        {renderCard({
          icon: SlidersHorizontal,
          title: 'Other',
          subtitle: 'Storefront hours, delivery areas and platform rules.',
          toggleKey: 'other_enabled',
          keys: [
            'store_hours_open', 'store_hours_close',
            'store_order_cutoff_lunch', 'store_order_cutoff_dinner',
            'store_delivery_locations',
            'cancellation_window_minutes', 'maintenance_mode',
          ],
        })}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
