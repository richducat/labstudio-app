const SESSION_VERSION = 'v1';
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signPayload(payload: string, secret: string) {
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export function getSessionSecret() {
  const configured = process.env.LABSTUDIO_SESSION_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') {
    return 'labstudio-dev-session-secret';
  }
  return '';
}

type SessionPayload = {
  v: string;
  uid: string;
  exp: number;
};

function encodePayload(payload: SessionPayload) {
  return toBase64Url(encoder.encode(JSON.stringify(payload)));
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const decoded = new TextDecoder().decode(fromBase64Url(value));
    const parsed: unknown = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const payload = parsed as Record<string, unknown>;
    if (payload.v !== SESSION_VERSION) return null;
    if (typeof payload.uid !== 'string' || !payload.uid.trim()) return null;
    if (!Number.isFinite(payload.exp)) return null;
    return { v: SESSION_VERSION, uid: payload.uid, exp: Number(payload.exp) };
  } catch {
    return null;
  }
}

export async function createLabstudioSessionToken(userId: string, secret: string, now = Date.now()) {
  const expiresAt = now + SESSION_COOKIE_MAX_AGE_SECONDS * 1000;
  const payload = encodePayload({ v: SESSION_VERSION, uid: userId, exp: expiresAt });
  const signature = await signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyLabstudioSessionToken(token: string, secret: string, now = Date.now()) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadRaw, signature] = parts;
  const payload = decodePayload(payloadRaw);
  if (!payload || payload.exp <= now) return null;

  try {
    const key = await importSigningKey(secret);
    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      encoder.encode(payloadRaw)
    );
    return verified ? { userId: payload.uid, expiresAt: payload.exp } : null;
  } catch {
    return null;
  }
}
