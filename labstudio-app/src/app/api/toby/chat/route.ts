import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TOBY_SYSTEM_PROMPT } from '@/lib/toby-protocol';
import { getTobyRetrievalContext } from '@/lib/toby-retrieval';
import { neon } from '@neondatabase/serverless';
import { ensureSchema } from '@/lib/db';

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
  content?: string | null;
  name?: string;
  tool_calls?: TobyToolCall[];
  tool_call_id?: string;
};

export async function POST(req: Request) {
  try {
    const { message, history } = (await req.json().catch(() => ({}))) as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    };
    const text = String(message || '').trim();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

    const jar = await cookies();
    const uid = jar.get('labstudio_uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const model = process.env.TOBY_MODEL || 'gpt-4o'; // Use gpt-4o for tool calling reliability

    // Build the message stack
    const messages: TobyMessage[] = [{ role: 'system', content: TOBY_SYSTEM_PROMPT }];

    // Add history
    if (Array.isArray(history)) {
      messages.push(...history.slice(-10));
    }

    // Add current user message if not already in history
    if (!history?.length || history[history.length - 1].content !== text) {
      messages.push({ role: 'user', content: text });
    }

    // OpenAI Chat Completion call with Tools
    const firstRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
      }),
    });

    const firstJson = await firstRes.json();
    if (!firstRes.ok) throw new Error(firstJson?.error?.message || 'OpenAI API error');

    const firstMsg = firstJson.choices[0].message as TobyMessage;

    // Handle tool calls
    if (firstMsg.tool_calls) {
      messages.push(firstMsg);

      for (const toolCall of firstMsg.tool_calls) {
        const { name } = toolCall.function;
        const args = JSON.parse(toolCall.function.arguments);
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
            values (${uid}, ${args.weight_lbs}, ${args.body_fat_pct}, ${args.resting_hr}, ${args.note || 'Logged via Toby AI'})
          `;
          result = 'Stat logged successfully.';
        } else if (name === 'search_knowledge_base') {
          const retrieval = getTobyRetrievalContext(args.query);
          result = retrieval?.context || 'No relevant knowledge found.';
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: name,
          content: result,
        });
      }

      // Final completion after tool results
      const secondRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      });

      const secondJson = await secondRes.json();
      if (!secondRes.ok) throw new Error(secondJson?.error?.message || 'OpenAI API error (final)');

      return NextResponse.json({ reply: secondJson.choices[0].message.content });
    }

    return NextResponse.json({ reply: firstMsg.content });
  } catch (err: unknown) {
    console.error('Toby AI Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
