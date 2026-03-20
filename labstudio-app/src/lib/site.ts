export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
      : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim()}` : '');

  if (!raw) return null;

  try {
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getMetadataBase() {
  const siteUrl = getSiteUrl();
  return siteUrl ? new URL(siteUrl) : undefined;
}

export function getSafeRedirectPath(value: string | null | undefined, fallback = '/members') {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}

export function getRequestOrigin(headers: Headers) {
  const forwardedHost = headers.get('x-forwarded-host')?.trim();
  const host = forwardedHost || headers.get('host')?.trim();
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    return null;
  }

  const proto = headers.get('x-forwarded-proto')?.trim() || 'https';
  if (!/^https?$/i.test(proto)) {
    return null;
  }

  return `${proto.toLowerCase()}://${host}`;
}

export function getAppBaseUrl(headers: Headers) {
  return getSiteUrl() || getRequestOrigin(headers);
}
