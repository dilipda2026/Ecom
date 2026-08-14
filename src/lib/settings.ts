import { createServiceClient } from '@/infrastructure/supabase/service';
import { decryptSecret } from '@/lib/settings-crypto';

type SettingRow = { key: string; value: string; type: string; is_secret: boolean };

const TTL_MS = 15_000;
let cache: { data: Record<string, SettingRow> | null; fetchedAt: number } = { data: null, fetchedAt: 0 };

async function loadAll(): Promise<Record<string, SettingRow>> {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < TTL_MS) return cache.data;

  const supabase = createServiceClient();
  if (!supabase) return {};
  const { data } = await supabase
    .from('system_settings')
    .select('key, value, type, is_secret');
  const rows: Record<string, SettingRow> = {};
  (data ?? []).forEach((r) => {
    rows[r.key as string] = r as unknown as SettingRow;
  });
  cache = { data: rows, fetchedAt: now };
  return rows;
}

export function clearSettingsCache(): void {
  cache = { data: null, fetchedAt: 0 };
}

/** Read a single setting. Secret values are decrypted on read. Empty/unknown -> null */
export async function getSetting(key: string): Promise<string | null> {
  const all = await loadAll();
  const row = all[key];
  if (!row || !row.value) return null;
  if (row.is_secret) return decryptSecret(row.value) || null;
  return row.value;
}

/** Read a numeric setting. Returns fallback when unset/invalid */
export async function getNumericSetting(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key);
  if (!raw) return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

/** Read a JSON setting. Returns fallback when unset/invalid */
export async function getJsonSetting<T>(key: string, fallback: T): Promise<T> {
  const raw = await getSetting(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Read a boolean setting */
export async function getBooleanSetting(key: string, fallback: boolean): Promise<boolean> {
  const raw = await getSetting(key);
  if (!raw) return fallback;
  return raw === 'true';
}