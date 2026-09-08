import { getAuthenticatedUserId } from '@/lib/authenticated-user';
import { NextResponse } from 'next/server';
import { dbConfigured, ensureSchema, getOrCreateUser } from '@/lib/db';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';

const ACTIVE_GAME_ID = 'reaction-lab';

function sql() {
    const url = process.env.DATABASE_URL || '';
    if (!url) throw new Error('DATABASE_URL not configured');
    return neon(url);
}

export async function POST(req: Request) {
    if (!dbConfigured()) {
        return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
    }

    const uid = await getAuthenticatedUserId();
    if (!uid) {
        return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    }

    try {
        const body = (await req.json().catch(() => ({}))) as { gameId?: unknown; score?: unknown };
        const gameId = String(body.gameId || '').trim();
        const rawScore = typeof body.score === 'number' ? body.score : NaN;
        const score = Number.isFinite(rawScore) ? Math.floor(rawScore) : NaN;

        if (!gameId || !Number.isFinite(score) || score < 0) {
            return NextResponse.json({ ok: false, error: 'Invalid gameId or score' }, { status: 400 });
        }
        if (gameId !== ACTIVE_GAME_ID) {
            return NextResponse.json({ ok: false, error: 'Unsupported gameId' }, { status: 400 });
        }

        await ensureSchema();
        await getOrCreateUser(uid);

        const q = sql();

        // 1. Record the score
        await q`
      insert into lab_game_scores (user_id, game_id, score)
      values (${uid}, ${gameId}, ${score});
    `;

        // Award XP only for positive scores.
        const xpReward = score > 0 ? Math.max(1, Math.floor(score / 10)) : 0;
        if (xpReward > 0) {
            await q`
      update lab_users
      set xp = xp + ${xpReward}
      where id = ${uid};
    `;
        }

        return NextResponse.json({ ok: true, xpAwarded: xpReward });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown score submission error';
        console.error('Score submission error:', err);
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    if (!dbConfigured()) {
        return NextResponse.json({ ok: false, error: 'DATABASE_URL not configured' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');
    const scope = searchParams.get('scope');

    const q = sql();

    if (gameId) {
        if (gameId !== ACTIVE_GAME_ID) {
            return NextResponse.json({ ok: true, leaderboards: [] });
        }
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
    } else if (scope === 'global') {
        const leaderboards = await q`
      with best_scores as (
        select user_id, game_id, max(score)::int as best_score
        from lab_game_scores
        where score > 0 and game_id = ${ACTIVE_GAME_ID}
        group by user_id, game_id
      )
      select
        u.display_name,
        sum(best_scores.best_score)::int as score,
        count(*)::int as games_played
      from best_scores
      join lab_users u on best_scores.user_id = u.id
      group by best_scores.user_id, u.display_name
      order by score desc, games_played desc, u.display_name asc nulls last
      limit 10;
    `;
        return NextResponse.json({ ok: true, leaderboards });
    } else {
        // Get high scores for ALL games (for the selection hub)

        const uid = await getAuthenticatedUserId();

        const highScores = uid ? await q`
      select game_id, max(score) as top_score
      from lab_game_scores
      where user_id = ${uid} and game_id = ${ACTIVE_GAME_ID}
      group by game_id;
    ` : [];

        return NextResponse.json({ ok: true, highScores });
    }
}
