// app/src/utils/crypto.ts
// Client-side AES-256-GCM encryption for API credentials.
// Credentials are encrypted before being sent to Supabase and decrypted on read.

import type { ApiCredentials } from '../store/dataSourcesSlice';

const ALGORITHM = 'AES-GCM';

const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM

/**
 * Derive a CryptoKey from the hex-encoded encryption key in env vars.
 * Uses the raw key bytes directly (the env var must be exactly 64 hex chars = 32 bytes).
 */
async function getKey(): Promise<CryptoKey> {
  const hexKey = import.meta.env.VITE_ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error(
      'VITE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
    );
  }

  const keyBytes = new Uint8Array(
    hexKey.match(/.{2}/g)!.map((byte: string) => parseInt(byte, 16)),
  );

  return crypto.subtle.importKey('raw', keyBytes, ALGORITHM, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypt credentials to a base64 string (IV prepended to ciphertext).
 */
export async function encryptCredentials(
  creds: ApiCredentials,
): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = new TextEncoder().encode(JSON.stringify(creds));

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    plaintext,
  );

  // Prepend IV to ciphertext so we can extract it on decrypt
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64 string back to ApiCredentials.
 */
export async function decryptCredentials(
  encrypted: string,
): Promise<ApiCredentials> {
  const key = await getKey();
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext,
  );

  return JSON.parse(new TextDecoder().decode(plaintext));
}
