import { NextResponse } from 'next/server';
import { TOBY_SYSTEM_PROMPT } from '@/lib/toby-protocol';
import { getTobyRetrievalContext } from '@/lib/toby-retrieval';
import { getTobyLlmConfig, getUpstreamErrorMessage } from '@/lib/toby-llm';
import { callTobyWrapper, getTobyWrapperMode } from '@/lib/toby-wrapper';

export const runtime = 'nodejs';

const ALLOW_ORIGIN = 'https://labstudio.fit';

function corsHeaders(origin: string | null) {
  const o = origin === ALLOW_ORIGIN ? origin : ALLOW_ORIGIN;
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-labstudio-key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

type TobyResponsesJson = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

type TobyChatCompletionJson = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function chatContentToText(content: string | Array<{ type?: string; text?: string }> | undefined) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin');

  // Only accept browser calls from marketing origin.
  if (origin && origin !== ALLOW_ORIGIN) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403, headers: corsHeaders(origin) },
    );
  }

  const requiredKey = process.env.LABSTUDIO_ACCESS_CODE;
  const providedKey = req.headers.get('x-labstudio-key');

  if (!requiredKey) {
    return NextResponse.json(
      { error: 'Server not configured (LABSTUDIO_ACCESS_CODE missing)' },
      { status: 500, headers: corsHeaders(origin) },
    );
  }

  if (!providedKey || providedKey !== requiredKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders(origin) },
    );
  }

  const { message } = (await req.json().catch(() => ({}))) as { message?: string };
  const text = String(message || '').trim();
  if (!text) {
    return NextResponse.json(
      { error: 'Missing message' },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  const retrieval = getTobyRetrievalContext(text);
  const wrapperMode = getTobyWrapperMode();
  const strictWrapper = (process.env.TOBY_WRAPPER_STRICT || 'false').toLowerCase() === 'true';

  if (wrapperMode.enabled) {
    if ('error' in wrapperMode) {
      if (strictWrapper) {
        return NextResponse.json(
          { error: wrapperMode.error },
          { status: 500, headers: corsHeaders(origin) },
        );
      }
    } else {
      const wrapperResult = await callTobyWrapper({
        url: wrapperMode.url,
        apiKey: wrapperMode.apiKey,
        timeoutMs: wrapperMode.timeoutMs,
        message: text,
        accessCode: process.env.TOBY_CHAT_WRAPPER_ACCESS_CODE?.trim() || providedKey,
      });

      if (wrapperResult.ok) {
        return NextResponse.json(
          {
            reply: wrapperResult.reply,
            retrieval: retrieval?.sources ? { sources: retrieval.sources } : undefined,
            provider: 'wrapper',
          },
          { headers: corsHeaders(origin) },
        );
      }

      if (strictWrapper) {
        return NextResponse.json(
          { error: wrapperResult.error, detail: wrapperResult.detail },
          { status: wrapperResult.status, headers: corsHeaders(origin) },
        );
      }

      console.warn('Toby public wrapper failed; falling back to configured LLM provider', {
        status: wrapperResult.status,
        error: wrapperResult.error,
      });
    }
  }

  const llmConfig = getTobyLlmConfig('gpt-4.1-mini');
  if (!llmConfig.ok) {
    return NextResponse.json(
      { error: llmConfig.error },
      { status: 500, headers: corsHeaders(origin) },
    );
  }
  const llm = llmConfig.value;

  const inputMessages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: TOBY_SYSTEM_PROMPT },
  ];

  if (retrieval?.context) {
    inputMessages.push({
      role: 'system',
      content:
        `${retrieval.context}\n\n` +
        `Rules for using excerpts:\n` +
        `- Only use if it actually matches the question.\n` +
        `- Do NOT mention "excerpts" or the retrieval system.\n` +
        `- If you use specific details from an excerpt, cite the source_file in parentheses, e.g. (source: <file>).\n`,
    });
  }

  inputMessages.push({ role: 'user', content: text.slice(0, 2000) });

  let reply = '';

  if (llm.provider === 'openai' && llm.responsesUrl) {
    const res = await fetch(llm.responsesUrl, {
      method: 'POST',
      headers: llm.headers,
      body: JSON.stringify({
        model: llm.model,
        input: inputMessages,
        max_output_tokens: 220,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as TobyResponsesJson;
    if (!res.ok) {
      return NextResponse.json(
        {
          error: getUpstreamErrorMessage(json, 'OpenAI error'),
          detail: json,
        },
        { status: 502, headers: corsHeaders(origin) },
      );
    }

    const parts: string[] = [];
    for (const item of json.output || []) {
      for (const c of item?.content || []) {
        if (c?.type === 'output_text' && typeof c.text === 'string') parts.push(c.text);
      }
    }
    reply = parts.join('\n').trim();
  } else {
    const res = await fetch(llm.chatCompletionsUrl, {
      method: 'POST',
      headers: llm.headers,
      body: JSON.stringify({
        model: llm.model,
        messages: inputMessages,
        max_tokens: 220,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as TobyChatCompletionJson;
    if (!res.ok) {
      return NextResponse.json(
        {
          error: getUpstreamErrorMessage(json, `${llm.provider} error`),
          detail: json,
        },
        { status: 502, headers: corsHeaders(origin) },
      );
    }

    reply = chatContentToText(json.choices?.[0]?.message?.content);
  }

  return NextResponse.json(
    {
      reply: reply || '(no response)',
      retrieval: retrieval?.sources ? { sources: retrieval.sources } : undefined,
    },
    { headers: corsHeaders(origin) },
  );
}
