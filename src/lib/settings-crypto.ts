import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const KEY_ENV = 'SETTINGS_ENC_KEY';
const SEPARATOR = '.';

function getKey(): Buffer | null {
  const hex = process.env[KEY_ENV];
  if (!hex) return null;
  try {
    const buf = Buffer.from(hex, 'hex');
    return buf.length === 32 ? buf : null;
  } catch {
    return null;
  }
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

export function encryptSecret(plain: string): string | null {
  const key = getKey();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}${SEPARATOR}${tag.toString('hex')}${SEPARATOR}${enc.toString('hex')}`;
}

export function decryptSecret(payload: string): string | null {
  const key = getKey();
  if (!key) return null;
  const parts = payload.split(SEPARATOR);
  if (parts.length !== 3) return null;
  try {
    const [ivHex, tagHex, dataHex] = parts;
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return null;
  }
}