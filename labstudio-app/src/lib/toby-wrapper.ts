import { getUpstreamErrorMessage } from '@/lib/toby-llm';

type TobyWrapperMode =
  | { enabled: false }
  | {
      enabled: true;
      url: string;
      apiKey?: string;
      timeoutMs: number;
    }
  | {
      enabled: true;
      error: string;
    };

type WrapperHistoryMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type TobyWrapperCallInput = {
  url: string;
  apiKey?: string;
  timeoutMs: number;
  message: string;
  history?: WrapperHistoryMessage[];
  accessCode?: string;
};

type TobyWrapperCallResult =
  | { ok: true; reply: string; detail: unknown }
  | { ok: false; status: number; error: string; detail: unknown };

const LOCAL_WRAPPER_URL = 'http://localhost:3002/api/toby/chat';

function normalizeWrapperUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/api/toby/chat';
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function parseTimeoutMs() {
  const raw = process.env.TOBY_CHAT_WRAPPER_TIMEOUT_MS?.trim();
  if (!raw) return 25000;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 25000;

  return Math.min(Math.max(parsed, 1000), 120000);
}

function extractReply(json: unknown) {
  if (!json || typeof json !== 'object') return '';
  const obj = json as Record<string, unknown>;

  if (typeof obj.reply === 'string' && obj.reply.trim()) return obj.reply.trim();
  if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim();
  if (typeof obj.output_text === 'string' && obj.output_text.trim()) return obj.output_text.trim();

  const choices = obj.choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const first = choices[0];
  if (!first || typeof first !== 'object') return '';
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return '';

  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  const parts = content
    .map((c) => {
      if (!c || typeof c !== 'object') return '';
      const text = (c as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .filter(Boolean);

  return parts.join('\n').trim();
}

function formatNetworkError(err: unknown) {
  if (!(err instanceof Error)) return 'Toby wrapper network error';

  const cause = (err as Error & { cause?: unknown }).cause;
  if (!cause || typeof cause !== 'object') return err.message;

  const maybeCause = cause as { code?: unknown; message?: unknown; hostname?: unknown };
  const code = typeof maybeCause.code === 'string' ? maybeCause.code : '';
  const message = typeof maybeCause.message === 'string' ? maybeCause.message : '';
  const hostname = typeof maybeCause.hostname === 'string' ? maybeCause.hostname : '';

  const details = [code, message, hostname ? `host=${hostname}` : ''].filter(Boolean).join(' | ');
  return details ? `${err.message} (${details})` : err.message;
}

function serializeNetworkError(err: unknown) {
  if (!(err instanceof Error)) return err;
  const cause = (err as Error & { cause?: unknown }).cause;
  if (!cause || typeof cause !== 'object') return { message: err.message };

  const maybeCause = cause as {
    code?: unknown;
    errno?: unknown;
    syscall?: unknown;
    hostname?: unknown;
    message?: unknown;
  };

  return {
    message: err.message,
    cause: {
      code: typeof maybeCause.code === 'string' ? maybeCause.code : undefined,
      errno: typeof maybeCause.errno === 'number' ? maybeCause.errno : undefined,
      syscall: typeof maybeCause.syscall === 'string' ? maybeCause.syscall : undefined,
      hostname: typeof maybeCause.hostname === 'string' ? maybeCause.hostname : undefined,
      message: typeof maybeCause.message === 'string' ? maybeCause.message : undefined,
    },
  };
}

export function getTobyWrapperMode(): TobyWrapperMode {
  const provider = (process.env.TOBY_AI_PROVIDER || 'auto').trim().toLowerCase();
  const explicitUrl = process.env.TOBY_CHAT_WRAPPER_URL?.trim();

  if (explicitUrl) {
    return {
      enabled: true,
      url: normalizeWrapperUrl(explicitUrl),
      apiKey: process.env.TOBY_CHAT_WRAPPER_API_KEY?.trim() || undefined,
      timeoutMs: parseTimeoutMs(),
    };
  }

  if (provider !== 'wrapper') return { enabled: false };

  if (process.env.NODE_ENV !== 'production') {
    return {
      enabled: true,
      url: LOCAL_WRAPPER_URL,
      apiKey: process.env.TOBY_CHAT_WRAPPER_API_KEY?.trim() || undefined,
      timeoutMs: parseTimeoutMs(),
    };
  }

  return {
    enabled: true,
    error: 'TOBY_CHAT_WRAPPER_URL not configured for TOBY_AI_PROVIDER=wrapper',
  };
}

export async function callTobyWrapper(input: TobyWrapperCallInput): Promise<TobyWrapperCallResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (input.apiKey) headers.Authorization = `Bearer ${input.apiKey}`;
  if (input.accessCode) headers['x-labstudio-key'] = input.accessCode;
  const cfClientId = process.env.TOBY_CHAT_WRAPPER_CF_ACCESS_CLIENT_ID?.trim();
  const cfClientSecret = process.env.TOBY_CHAT_WRAPPER_CF_ACCESS_CLIENT_SECRET?.trim();
  if (cfClientId && cfClientSecret) {
    headers['CF-Access-Client-Id'] = cfClientId;
    headers['CF-Access-Client-Secret'] = cfClientSecret;
  }

  const body: Record<string, unknown> = { message: input.message };
  if (input.history?.length) body.history = input.history;

  try {
    const res = await fetch(input.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(input.timeoutMs),
    });

    const contentType = res.headers.get('content-type') || '';
    let json: unknown = {};
    let textBody = '';
    if (contentType.includes('application/json')) {
      json = await res.json().catch(() => ({}));
    } else {
      textBody = await res.text().catch(() => '');
    }

    const cfRay = res.headers.get('cf-ray');
    if (!res.ok) {
      const errorFromJson = getUpstreamErrorMessage(json, '').trim();
      const errorFromText = textBody.trim();
      const detailMessage =
        errorFromJson ||
        errorFromText ||
        (cfRay ? `Cloudflare denied request (cf-ray: ${cfRay})` : `HTTP ${res.status}`);

      return {
        ok: false,
        status: res.status,
        error: `Toby wrapper HTTP ${res.status}: ${detailMessage}`,
        detail:
          typeof json === 'object' && json && Object.keys(json as Record<string, unknown>).length
            ? json
            : {
                body: textBody.slice(0, 500),
                cfRay: cfRay || undefined,
                url: input.url,
              },
      };
    }

    const reply = extractReply(json) || textBody.trim();
    if (!reply) {
      return {
        ok: false,
        status: 502,
        error: 'Toby wrapper returned no reply text',
        detail:
          typeof json === 'object' && json && Object.keys(json as Record<string, unknown>).length
            ? json
            : { body: textBody.slice(0, 500), url: input.url },
      };
    }

    return { ok: true, reply, detail: json };
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      return {
        ok: false,
        status: 504,
        error: `Toby wrapper timeout after ${input.timeoutMs}ms`,
        detail: { message: err.message },
      };
    }

    return {
      ok: false,
      status: 502,
      error: formatNetworkError(err),
      detail: serializeNetworkError(err),
    };
  }
}
