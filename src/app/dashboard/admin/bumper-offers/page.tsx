'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Loader2, Save, Pencil, Trash2, Plus,
  ChevronUp, ChevronDown, Upload, ImageIcon,
} from 'lucide-react';
import { PageHeader, ToastContainer, useToast, LoadingSkeleton } from '@/components/ui/data-table';
import { getSystemSettings, updateSystemSetting } from '@/features/admin/actions';
import { authService } from '@/features/auth/services/auth-service';
import type { SystemSetting } from '@/features/admin/types';

interface BumperOfferItem {
  type: 'image' | 'video';
  url: string;
  alt?: string;
  order: number;
}

const inputClass = 'w-full bg-zgray border border-zborder rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zred/20 focus:border-zred';

const ENABLED_KEY = 'bumper_offers_enabled';
const OFFERS_KEY = 'bumper_offers';

export default function AdminBumperOffersPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [enabledValue, setEnabledValue] = useState('true');
  const [originalEnabledValue, setOriginalEnabledValue] = useState('true');
  const [bumperOffers, setBumperOffers] = useState<BumperOfferItem[]>([]);
  const [originalBumperOffers, setOriginalBumperOffers] = useState<BumperOfferItem[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const fetchSettings = useCallback(async () => {
    const res = await getSystemSettings();
    if (res.success && res.data) {
      const data = res.data as SystemSetting[];
      setSettings(data);
      const enabledRow = data.find((s) => s.key === ENABLED_KEY);
      const offersRow = data.find((s) => s.key === OFFERS_KEY);
      const enabledVal = enabledRow?.value ?? 'true';
      let offers: BumperOfferItem[] = [];
      try {
        offers = JSON.parse(offersRow?.value ?? '[]');
      } catch {
        offers = [];
      }
      offers.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setEnabledValue(enabledVal);
      setOriginalEnabledValue(enabledVal);
      setBumperOffers(offers);
      setOriginalBumperOffers([...offers]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = bumperOffers.length !== originalBumperOffers.length
    || JSON.stringify(bumperOffers) !== JSON.stringify(originalBumperOffers)
    || enabledValue !== originalEnabledValue;

  const dirtyCount = (isDirty ? 1 : 0);

  const handleSave = async () => {
    const session = await authService.getSession();
    if (!session.user) {
      addToast('Session expired — please sign in again', 'error');
      window.location.href = '/auth/login';
      return;
    }
    if (!isDirty) {
      addToast('No changes to save', 'info');
      return;
    }
    for (let i = 0; i < bumperOffers.length; i++) {
      if (!bumperOffers[i].url.trim()) {
        addToast(`Item ${i + 1} · URL is required`, 'error');
        return;
      }
    }
    setSaving(true);
    const errors: string[] = [];

    const enabledRow = settings.find((s) => s.key === ENABLED_KEY);
    if (enabledRow && enabledValue !== originalEnabledValue) {
      const res = await updateSystemSetting(enabledRow.id, enabledValue);
      if (!res.success) errors.push(`enable toggle: ${res.error ?? 'save failed'}`);
    }

    const offersRow = settings.find((s) => s.key === OFFERS_KEY);
    if (offersRow && JSON.stringify(bumperOffers) !== JSON.stringify(originalBumperOffers)) {
      const res = await updateSystemSetting(offersRow.id, JSON.stringify(bumperOffers));
      if (!res.success) errors.push(res.error ?? 'save failed');
    }

    setSaving(false);
    if (errors.length) {
      addToast(errors.join('; '), 'error');
      return;
    }
    addToast('Bumper offers saved', 'success');
    setEditing(false);
    fetchSettings();
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= bumperOffers.length) return;
    const next = [...bumperOffers];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    next.forEach((item, i) => { item.order = i; });
    setBumperOffers(next);
  };

  const handleDelete = (index: number) => {
    const next = bumperOffers.filter((_, i) => i !== index);
    next.forEach((item, i) => { item.order = i; });
    setBumperOffers(next);
  };

  const handleUrlChange = (index: number, url: string) => {
    const next = [...bumperOffers];
    next[index] = { ...next[index], url };
    setBumperOffers(next);
  };

  const handleAltChange = (index: number, alt: string) => {
    const next = [...bumperOffers];
    next[index] = { ...next[index], alt };
    setBumperOffers(next);
  };

  const handleTypeChange = (index: number, type: 'image' | 'video') => {
    const next = [...bumperOffers];
    next[index] = { ...next[index], type };
    setBumperOffers(next);
  };

  const handleAdd = () => {
    setBumperOffers((prev) => [
      ...prev,
      { type: 'image', url: '', alt: '', order: prev.length },
    ]);
  };

  const detectTypeFromUrl = (url: string): 'image' | 'video' | null => {
    const clean = url.split('?')[0].toLowerCase();
    if (/\.(mp4|webm|mov)$/.test(clean)) return 'video';
    if (/\.(jpe?g|png|webp|gif)$/.test(clean)) return 'image';
    return null;
  };

  const handleUpload = async (file: File, index: number) => {
    setUploadingIndex(index);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'bumper');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setBumperOffers((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], url: data.url, type: data.type === 'video' ? 'video' : 'image' };
          return next;
        });
        addToast('Media uploaded', 'success');
      } else {
        addToast(data.error ?? 'Upload failed', 'error');
      }
    } catch {
      addToast('Upload failed', 'error');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, index);
    e.target.value = '';
  };

  const triggerFileInput = (index: number) => {
    const input = document.getElementById(`bumper-upload-${index}`) as HTMLInputElement | null;
    input?.click();
  };

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 bg-zgray rounded-lg animate-pulse mb-6" />
        <LoadingSkeleton rows={4} cols={1} />
      </div>
    );
  }

  const enabled = enabledValue === 'true';

  return (
    <div>
      <PageHeader title="Bumper Offers" description="Images and videos shown in the home screen slider. Videos play fully before advancing.">
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="button-z button-z-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {dirtyCount > 0 ? 'Save Changes' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); fetchSettings(); }}
              disabled={saving}
              className="button-z button-z-ghost flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-60"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="button-z button-z-primary flex items-center gap-2 text-sm px-4 py-2"
          >
            <Pencil size={16} />
            Edit Offers
          </button>
        )}
        <button onClick={() => { setLoading(true); fetchSettings(); }} aria-label="Refresh bumper offers" className="p-2.5 rounded-xl hover:bg-zgray text-ztext-lighter transition-colors">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
        </button>
      </PageHeader>

      <div className="bg-zcard rounded-2xl p-6 border border-zborder shadow-sm">
        {/* Enable/disable */}
        <div className="flex items-center justify-between pb-4 border-b border-zborder mb-5">
          <div>
            <h2 className="text-sm font-semibold text-ztext">Show on Home Screen</h2>
            <p className="text-xs text-ztext-lighter">When off, the default promo banner is shown instead.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={saving || !editing}
            onClick={() => setEnabledValue(enabled ? 'false' : 'true')}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? 'bg-zred' : 'bg-zsurface'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {!enabled ? (
          <p className="text-sm text-ztext-lighter py-6 text-center">Bumper offers are hidden from the home screen.</p>
        ) : bumperOffers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-ztext-lighter mb-4">No media added yet</p>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !editing}
              className="button-z button-z-primary flex items-center gap-2 text-sm px-4 py-2"
            >
              <Plus size={16} />
              Add First Item
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bumperOffers.map((item, index) => (
              <div
                key={index}
                className="bg-zsurface rounded-xl p-4 border border-zborder flex flex-col lg:flex-row gap-4 items-start lg:items-center"
              >
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleReorder(index, index - 1)}
                    disabled={index === 0 || saving || !editing}
                    className="button-z button-z-ghost p-1.5"
                    aria-label="Move up"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(index, index + 1)}
                    disabled={index >= bumperOffers.length - 1 || saving || !editing}
                    className="button-z button-z-ghost p-1.5"
                    aria-label="Move down"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                <div className="flex-1 w-full flex flex-col gap-3 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-ztext-lighter">#{index + 1}</span>
                    <select
                      value={item.type}
                      onChange={(e) => handleTypeChange(index, e.target.value as 'image' | 'video')}
                      disabled={saving || !editing}
                      className={`${inputClass} w-36`}
                      aria-label={`Media type for item ${index + 1}`}
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="https://example.com/media.jpg or /uploads/..."
                      value={item.url}
                      onChange={(e) => {
                        handleUrlChange(index, e.target.value);
                        const detected = detectTypeFromUrl(e.target.value);
                        if (detected && detected !== item.type) handleTypeChange(index, detected);
                      }}
                      disabled={saving || !editing}
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => triggerFileInput(index)}
                      disabled={saving || !editing || uploadingIndex !== null}
                      className="button-z button-z-ghost px-3 py-2 flex items-center gap-2"
                      aria-label="Upload media"
                    >
                      {uploadingIndex === index ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      Upload
                    </button>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                      onChange={(e) => handleFileSelect(e, index)}
                      className="hidden"
                      id={`bumper-upload-${index}`}
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Alt text (for accessibility)"
                    value={item.alt ?? ''}
                    onChange={(e) => handleAltChange(index, e.target.value)}
                    disabled={saving || !editing}
                    className={inputClass}
                  />

                  {item.url && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ztext-lighter shrink-0">Preview:</span>
                      {item.type === 'image' ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={item.url} alt={item.alt ?? ''} className="h-20 w-auto max-w-[60%] rounded-lg border border-zborder object-cover" />
                      ) : (
                        <video src={item.url} className="h-20 w-auto max-w-[60%] rounded-lg border border-zborder" controls muted />
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  disabled={saving || !editing}
                  className="button-z button-z-ghost p-2 self-end lg:self-center hover:text-red-400"
                  aria-label={`Delete item ${index + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !editing}
              className="button-z button-z-outline flex items-center gap-2 mx-auto"
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-ztext-lighter bg-zcard/60 border border-zborder/60 rounded-xl p-4">
        <ImageIcon size={14} className="shrink-0 mt-0.5" />
        <p>
          Order defines playback order. Images show ~5 seconds each; uploaded videos play fully before the next item.
          Supported: JPG, PNG, WEBP, GIF images and MP4, WEBM, MOV videos up to 50MB.
        </p>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
