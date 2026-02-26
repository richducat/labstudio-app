import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbConfigured, ensureSchema, getOrCreateUser } from '@/lib/db';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

function sql() {
    const url = process.env.DATABASE_URL || '';
    if (!url) throw new Error('DATABASE_URL not configured');
    return neon(url);
}

export async function POST(req: Request) {
    if (!dbConfigured()) {
        return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
    }

    const jar = await cookies();
    const uid = jar.get('labstudio_uid')?.value;
    if (!uid) {
        return NextResponse.json({ ok: false, error: 'Missing labstudio_uid cookie' }, { status: 401 });
    }

    try {
        const { gameId, score } = await req.json();

        if (!gameId || typeof score !== 'number') {
            return NextResponse.json({ ok: false, error: 'Invalid gameId or score' }, { status: 400 });
        }

        await ensureSchema();
        await getOrCreateUser(uid);

        const q = sql();

        // 1. Record the score
        await q`
      insert into lab_game_scores (user_id, game_id, score)
      values (${uid}, ${gameId}, ${score});
    `;

        // 2. Award XP (1 XP per 10 points, min 1 if score > 0)
        const xpReward = Math.max(1, Math.floor(score / 10));
        await q`
      update lab_users
      set xp = xp + ${xpReward}
      where id = ${uid};
    `;

        return NextResponse.json({ ok: true, xpAwarded: xpReward });
    } catch (err: any) {
        console.error('Score submission error:', err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    if (!dbConfigured()) {
        return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');

    const q = sql();

    if (gameId) {
        // Get top 10 for specific game
        const leaderboards = await q`
      select u.display_name, gs.score, gs.created_at
      from lab_game_scores gs
      join lab_users u on gs.user_id = u.id
      where gs.game_id = ${gameId}
      order by gs.score desc
      limit 10;
    `;
        return NextResponse.json({ ok: true, leaderboards });
    } else {
        // Get high scores for ALL games (for the selection hub)
        const jar = await cookies();
        const uid = jar.get('labstudio_uid')?.value;

        const highScores = uid ? await q`
      select game_id, max(score) as top_score
      from lab_game_scores
      where user_id = ${uid}
      group by game_id;
    ` : [];

        return NextResponse.json({ ok: true, highScores });
    }
}
