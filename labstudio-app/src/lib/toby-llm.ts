export type TobyProvider = 'openai' | 'ollama';

export type TobyLlmConfig = {
  provider: TobyProvider;
  model: string;
  chatCompletionsUrl: string;
  responsesUrl?: string;
  headers: Record<string, string>;
};

type TobyLlmConfigResult =
  | { ok: true; value: TobyLlmConfig }
  | { ok: false; error: string };

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function resolveProvider(): TobyProvider {
  const raw = (process.env.TOBY_AI_PROVIDER || 'auto').trim().toLowerCase();
  if (raw === 'ollama') return 'ollama';
  if (raw === 'openai') return 'openai';

  return process.env.OLLAMA_BASE_URL?.trim() || process.env.OLLAMA_URL?.trim()
    ? 'ollama'
    : 'openai';
}

function buildOllamaV1Url(baseUrl: string, endpoint: string) {
  const normalizedBase = trimTrailingSlash(baseUrl.trim());
  if (normalizedBase.endsWith('/v1')) return `${normalizedBase}${endpoint}`;
  return `${normalizedBase}/v1${endpoint}`;
}

export function getTobyLlmConfig(defaultModel: string): TobyLlmConfigResult {
  const provider = resolveProvider();

  if (provider === 'ollama') {
    const baseUrl = (
      process.env.OLLAMA_BASE_URL ||
      process.env.OLLAMA_URL ||
      'http://127.0.0.1:11434'
    ).trim();
    const apiKey = process.env.OLLAMA_API_KEY?.trim();
    const model =
      process.env.OLLAMA_MODEL?.trim() || process.env.TOBY_MODEL?.trim() || defaultModel;

    return {
      ok: true,
      value: {
        provider,
        model,
        chatCompletionsUrl: buildOllamaV1Url(baseUrl, '/chat/completions'),
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
      },
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: 'OPENAI_API_KEY not configured' };
  }

  const model = process.env.TOBY_MODEL?.trim() || defaultModel;

  return {
    ok: true,
    value: {
      provider,
      model,
      chatCompletionsUrl: 'https://api.openai.com/v1/chat/completions',
      responsesUrl: 'https://api.openai.com/v1/responses',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    },
  };
}

export function getUpstreamErrorMessage(json: unknown, fallback: string) {
  if (!json || typeof json !== 'object') return fallback;
  const maybeError = (json as { error?: { message?: unknown } }).error;
  if (maybeError && typeof maybeError.message === 'string' && maybeError.message.trim()) {
    return maybeError.message;
  }
  return fallback;
}
