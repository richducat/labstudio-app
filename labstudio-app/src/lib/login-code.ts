import { createHmac, randomInt, randomUUID } from 'node:crypto';

export const LOGIN_CODE_TTL_SECONDS = 600;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;

export function normalizeLoginEmail(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter your member email address.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>(),;:\\"]+@[^\s@<>(),;:\\"]+\.[^\s@<>(),;:\\"]+$/.test(email)) {
    throw new Error('Enter a valid member email address.');
  }
  return email;
}

export function loginDigest(secret: string, purpose: string, value: string): string {
  if (secret.length < 32) throw new Error('Secure sign-in is temporarily unavailable.');
  return createHmac('sha256', secret).update(`lab-login-v2:${purpose}:${value}`).digest('hex');
}

export function makeLoginCode() {
  return { id: randomUUID(), code: String(randomInt(0, 1_000_000)).padStart(6, '0') };
}

export function validLoginProof(id: unknown, code: unknown): id is string {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    && typeof code === 'string' && /^\d{6}$/.test(code);
}
