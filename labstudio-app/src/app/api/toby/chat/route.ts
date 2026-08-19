import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TOBY_SYSTEM_PROMPT } from '@/lib/toby-protocol';
import { getTobyRetrievalContext } from '@/lib/toby-retrieval';
import { neon } from '@neondatabase/serverless';
import { ensureSchema } from '@/lib/db';
import { getTobyLlmConfig, getUpstreamErrorMessage } from '@/lib/toby-llm';
import { callTobyWrapper, getTobyWrapperMode } from '@/lib/toby-wrapper';
import { allow, clientIp } from '@/lib/ip-throttle';

export const runtime = 'nodejs';

function sql() {
  const url = process.env.DATABASE_URL || '';
  if (!url) throw new Error('DATABASE_URL not configured');
  return neon(url);
}

// Tool definitions for Toby Agent
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_user_context',
      description: 'Get user profile, goals, last 7 days of workouts, and latest vital stats (weight, body fat, HR).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_vital_stat',
      description: 'Record a new vital stat (weight_lbs, body_fat_pct, or resting_hr).',
      parameters: {
        type: 'object',
        properties: {
          weight_lbs: { type: 'number' },
          body_fat_pct: { type: 'number' },
          resting_hr: { type: 'number' },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Search the Lab Studio knowledge base for training, biomechanics, and nutrition information.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
      },
    },
  },
];

type TobyToolCall = {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
};

type TobyMessage = {
  role: string;
  content?: string | null | Array<{ type?: string; text?: string }>;
  name?: string;
  tool_calls?: TobyToolCall[];
  tool_call_id?: string;
};

type TobyChatCompletionJson = {
  choices?: Array<{
    message?: TobyMessage;
  }>;
  error?: {
    message?: string;
  };
};

function parseToolArguments(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function messageContentToText(content: TobyMessage['content']) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

function fallbackCoachReply(text: string) {
  const normalized = text.toLowerCase();

  if (/\b(leg|legs|squat|glute|hamstring|quad|lower)\b/.test(normalized)) {
    return "Legs, let's go. Keep it clean — squat or leg press, then some hamstring work, control on the way down. How much time you got today?";
  }

  if (/\b(nutrition|protein|macro|meal|food|calorie)\b/.test(normalized)) {
    return "Keep it simple, bro — protein at every meal, carbs around training, water all day. Steak and sweet potatoes never miss. What're you eating right now?";
  }

  if (/\b(book|booking|session|appointment|schedule)\b/.test(normalized)) {
    return "Hit the Book tab, pick what matches your goal, and grab a time — it'll pop up on your dashboard. Want me to point you at a good slot?";
  }

  if (/\b(recover|recovery|sore|sleep|mobility)\b/.test(normalized)) {
    return "Recovery's training too, dude. Keep it easy today, hit some mobility, protein and sleep. Is the soreness just muscle or is something pinching?";
  }

  return "I got you — training, food, recovery, whatever you need. What's on your mind today?";
}

async function chatCompletion(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
) {
  // Bound the upstream call so a slow/hung provider cannot pin the request and
  // pile up workers on the shared host.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as TobyChatCompletionJson;
    return { res, json };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  let fallbackText = '';

  try {
    // Toby calls a paid LLM per request. Throttle to stop cost amplification.
    const ip = clientIp(req);
    if (!allow(`toby:${ip}`, 20, 60_000)) {
      return NextResponse.json(
        { error: "Easy there — give me a second and ask again." },
        { status: 429 },
      );
    }

    const { message, history: rawHistory } = ((await req.json().catch(() => ({}))) ?? {}) as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    };

    // Bound input size so a single request cannot balloon token cost.
    const text = String(message || '').trim().slice(0, 2000);
    if (!text) return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    fallbackText = text;

    const history = Array.isArray(rawHistory)
      ? rawHistory
          .filter((m) => m && typeof m.content === 'string')
          .slice(-10)
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
      : undefined;

    const jar = await cookies();
    const uid = jar.get('labstudio_uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const retrieval = getTobyRetrievalContext(text);
    const wrapperMode = getTobyWrapperMode();
    const strictWrapper = (process.env.TOBY_WRAPPER_STRICT || 'false').toLowerCase() === 'true';

    if (wrapperMode.enabled) {
      if ('error' in wrapperMode) {
        if (strictWrapper) {
          return NextResponse.json({ error: wrapperMode.error }, { status: 500 });
        }
      } else {
        const wrapperResult = await callTobyWrapper({
          url: wrapperMode.url,
          apiKey: wrapperMode.apiKey,
          timeoutMs: wrapperMode.timeoutMs,
          message: text,
          history: Array.isArray(history) ? history.slice(-10) : undefined,
          accessCode:
            process.env.TOBY_CHAT_WRAPPER_ACCESS_CODE?.trim() ||
            process.env.LABSTUDIO_ACCESS_CODE?.trim(),
        });

        if (wrapperResult.ok) {
          return NextResponse.json({
            reply: wrapperResult.reply,
            retrieval: retrieval?.sources ? { sources: retrieval.sources } : undefined,
            provider: 'wrapper',
          });
        }

        if (strictWrapper) {
          return NextResponse.json(
            { error: wrapperResult.error, detail: wrapperResult.detail },
            { status: wrapperResult.status },
          );
        }

        console.warn('Toby wrapper failed; falling back to configured LLM provider', {
          status: wrapperResult.status,
          error: wrapperResult.error,
        });
      }
    }

    const llmConfig = getTobyLlmConfig('gpt-4o');
    if (!llmConfig.ok) {
      return NextResponse.json({
        reply: fallbackCoachReply(text),
        retrieval: retrieval?.sources ? { sources: retrieval.sources } : undefined,
        provider: 'fallback',
      });
    }
    const llm = llmConfig.value;

    // Build the message stack
    const messages: TobyMessage[] = [{ role: 'system', content: TOBY_SYSTEM_PROMPT }];
    if (retrieval?.context) {
      messages.push({
        role: 'system',
        content:
          `Here is some of how Toby has coached real clients, for background on his voice and approach. Let it inform how you sound; do NOT quote it, cite it, mention "excerpts", or reference any source. Just talk like this:\n\n${retrieval.context}`,
      });
    }

    // Add history
    if (Array.isArray(history)) {
      messages.push(...history.slice(-10));
    }

    // Add current user message if not already in history
    if (!history?.length || history[history.length - 1].content !== text) {
      messages.push({ role: 'user', content: text });
    }

    const ollamaToolsEnabled =
      (process.env.OLLAMA_TOOLS_ENABLED || 'false').toLowerCase() === 'true';
    const useTools = llm.provider === 'openai' || ollamaToolsEnabled;

    const firstPayload: Record<string, unknown> = {
      model: llm.model,
      messages,
      ...(llm.provider === 'openai' ? { max_completion_tokens: 1200, reasoning_effort: 'low' } : {}),
    };

    if (useTools) {
      firstPayload.tools = TOOLS;
      firstPayload.tool_choice = 'auto';
    }

    let firstResult = await chatCompletion(llm.chatCompletionsUrl, llm.headers, firstPayload);

    // Ollama-compatible servers often reject tool fields; retry once without tools.
    if (!firstResult.res.ok && useTools && llm.provider === 'ollama') {
      firstResult = await chatCompletion(llm.chatCompletionsUrl, llm.headers, {
        model: llm.model,
        messages,
      });
    }

    if (!firstResult.res.ok) {
      throw new Error(getUpstreamErrorMessage(firstResult.json, `${llm.provider} API error`));
    }

    const firstMsg = firstResult.json.choices?.[0]?.message;
    if (!firstMsg) throw new Error(`Invalid ${llm.provider} response`);

    // Handle tool calls
    if (firstMsg.tool_calls?.length) {
      messages.push(firstMsg);

      for (const toolCall of firstMsg.tool_calls) {
        const { name } = toolCall.function;
        const args = parseToolArguments(toolCall.function.arguments);
        let result = '';

        if (name === 'get_user_context') {
          await ensureSchema();
          const q = sql();
          const [profile, stats, workouts] = await Promise.all([
            q`select * from lab_user_profile where user_id = ${uid} limit 1`,
            q`select * from lab_daily_stats where user_id = ${uid} order by created_at desc limit 1`,
            q`select * from lab_workout_log where user_id = ${uid} and created_at > now() - interval '7 days' order by created_at desc`,
          ]);
          result = JSON.stringify({ profile: profile[0], latest_stats: stats[0], recent_workouts: workouts });
        } else if (name === 'log_vital_stat') {
          await ensureSchema();
          const q = sql();
          await q`
            insert into lab_daily_stats (user_id, weight_lbs, body_fat_pct, resting_hr, note)
            values (
              ${uid},
              ${typeof args.weight_lbs === 'number' ? args.weight_lbs : null},
              ${typeof args.body_fat_pct === 'number' ? args.body_fat_pct : null},
              ${typeof args.resting_hr === 'number' ? args.resting_hr : null},
              ${typeof args.note === 'string' ? args.note : 'Logged via Toby AI'}
            )
          `;
          result = 'Stat logged successfully.';
        } else if (name === 'search_knowledge_base') {
          const query = typeof args.query === 'string' ? args.query : text;
          const toolRetrieval = getTobyRetrievalContext(query);
          result = toolRetrieval?.context || 'No relevant knowledge found.';
        } else {
          result = `Unsupported tool: ${name}`;
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name,
          content: result,
        });
      }

      // Final completion after tool results
      const secondResult = await chatCompletion(llm.chatCompletionsUrl, llm.headers, {
        model: llm.model,
        messages,
        ...(llm.provider === 'openai' ? { max_completion_tokens: 1200, reasoning_effort: 'low' } : {}),
      });

      if (!secondResult.res.ok) {
        throw new Error(getUpstreamErrorMessage(secondResult.json, `${llm.provider} API error (final)`));
      }

      const finalContent = secondResult.json.choices?.[0]?.message?.content;
      return NextResponse.json({ reply: messageContentToText(finalContent) || '(no response)' });
    }

    return NextResponse.json({ reply: messageContentToText(firstMsg.content) || '(no response)' });
  } catch (err: unknown) {
    console.error('Toby AI Error:', err);
    if (fallbackText) {
      return NextResponse.json({
        reply: fallbackCoachReply(fallbackText),
        provider: 'fallback',
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
