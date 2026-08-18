import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TOBY_SYSTEM_PROMPT } from '@/lib/toby-protocol';
import { getTobyRetrievalContext } from '@/lib/toby-retrieval';
import { neon } from '@neondatabase/serverless';
import { ensureSchema } from '@/lib/db';
import { getTobyLlmConfig, getUpstreamErrorMessage } from '@/lib/toby-llm';
import { callTobyWrapper, getTobyWrapperMode } from '@/lib/toby-wrapper';

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
    return [
      'Here is a clean lower-body session for today:',
      '1. Warm up for 8-10 minutes with hips, ankles, hamstrings, and two light ramp sets.',
      '2. Main lift: squat or leg press for 4 sets of 5-8 controlled reps.',
      '3. Posterior chain: Romanian deadlift for 3 sets of 8-10.',
      '4. Single-leg work: split squat or step-up for 3 sets of 8 each side.',
      '5. Finish with calves, core, and 5 minutes of easy down-regulation.',
      'Keep 1-2 reps in reserve unless your coach programmed a hard push today.',
    ].join('\n');
  }

  if (/\b(nutrition|protein|macro|meal|food|calorie)\b/.test(normalized)) {
    return [
      'For nutrition today, anchor the day around protein, water, and consistency.',
      'Aim for a protein serving at each meal, add a carb around training, and keep fats moderate before hard sessions.',
      'If you log your meals in the app, I can use those numbers to keep the guidance tighter.',
    ].join('\n');
  }

  if (/\b(book|booking|session|appointment|schedule)\b/.test(normalized)) {
    return 'Open Book, choose the service that matches your goal, pick a time, and book it. After it is booked, it will show on your dashboard.';
  }

  if (/\b(recover|recovery|sore|sleep|mobility)\b/.test(normalized)) {
    return [
      'For recovery, keep today simple: easy movement, mobility for the tight areas, protein, hydration, and sleep.',
      'If soreness is sharp, one-sided, or changing your movement, skip max effort and book a coach check-in.',
    ].join('\n');
  }

  return [
    'I can help with training, nutrition, booking, and recovery.',
    'For today, pick one main priority, keep the session clean, and log what you complete so your dashboard stays current.',
    'If you want a precise plan, tell me the muscle group, time available, and any soreness or equipment limits.',
  ].join('\n');
}

async function chatCompletion(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
) {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as TobyChatCompletionJson;
  return { res, json };
}

export async function POST(req: Request) {
  let fallbackText = '';

  try {
    const { message, history } = (await req.json().catch(() => ({}))) as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    };

    const text = String(message || '').trim();
    if (!text) return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    fallbackText = text;

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
          `${retrieval.context}\n\n` +
          `Rules for using excerpts:\n` +
          `- Only use if it actually matches the question.\n` +
          `- Do NOT mention "excerpts" or the retrieval system.\n` +
          `- If you use specific details from an excerpt, cite the source_file in parentheses, e.g. (source: <file>).\n`,
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
