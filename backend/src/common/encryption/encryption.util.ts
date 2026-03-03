import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALG = 'aes-256-gcm';
const IV_LEN = 16;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SALT_LEN = 32;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'nature-secret-default-key-change-in-production-32b';
  if (secret.length < 32) {
    const salt = process.env.ENCRYPTION_SALT || 'nature-secret-salt';
    return scryptSync(secret, salt, KEY_LEN);
  }
  return Buffer.from(secret.slice(0, 32), 'utf8');
}

/** Encrypt plaintext; returns base64(iv + tag + ciphertext). Safe for DB storage. */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null;
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/** Decrypt value from DB. */
export function decrypt(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null || ciphertext === '') return null;
  try {
    const key = getKey();
    const buf = Buffer.from(ciphertext, 'base64');
    if (buf.length < IV_LEN + TAG_LEN) return null;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALG, key, iv, { authTagLength: TAG_LEN });
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch {
    return null;
  }
}

/** TypeORM transformer for encrypted string columns. */
export const encryptedTransformer = {
  to: (v: string | null | undefined): string | null => encrypt(v),
  from: (v: string | null | undefined): string | null => decrypt(v),
};
