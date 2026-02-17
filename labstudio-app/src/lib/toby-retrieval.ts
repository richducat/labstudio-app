import fs from 'node:fs';
import path from 'node:path';

type ChunkDoc = {
  id: string;
  title: string;
  sourceFile: string;
  text: string;
};

let cached:
  | {
      docs: ChunkDoc[];
      loadedAtMs: number;
    }
  | undefined;

function parseFrontmatter(md: string): { meta: Record<string, string>; body: string } {
  const trimmed = md.replace(/\r\n/g, '\n');
  if (!trimmed.startsWith('---\n')) return { meta: {}, body: md };

  const end = trimmed.indexOf('\n---\n', 4);
  if (end === -1) return { meta: {}, body: md };

  const fm = trimmed.slice(4, end);
  const body = trimmed.slice(end + '\n---\n'.length);

  const meta: Record<string, string> = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([a-zA-Z0-9_\-]+):\s*(.*)$/);
    if (!m) continue;
    meta[m[1]] = m[2];
  }
  return { meta, body: body.trim() };
}

function tokenize(q: string) {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 12);
}

function scoreText(textLower: string, tokens: string[]) {
  let score = 0;
  for (const t of tokens) {
    // Cheap-ish scoring: count occurrences (capped)
    let idx = 0;
    let hits = 0;
    while (true) {
      idx = textLower.indexOf(t, idx);
      if (idx === -1) break;
      hits++;
      idx += t.length;
      if (hits >= 8) break;
    }
    score += hits;
  }
  return score;
}

export function getTobyRetrievalContext(userText: string):
  | { context: string; sources: Array<{ id: string; title: string; sourceFile: string }> }
  | undefined {
  const enabled = (process.env.TOBY_RETRIEVAL_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) return undefined;

  const tokens = tokenize(userText);
  if (tokens.length < 2) return undefined;

  const chunksDir = path.join(process.cwd(), 'data', 'toby', 'chunks');
  if (!fs.existsSync(chunksDir)) return undefined;

  if (!cached) {
    const files = fs
      .readdirSync(chunksDir)
      .filter((f) => f.toLowerCase().endsWith('.md'))
      .slice(0, 2000);

    const docs: ChunkDoc[] = [];
    for (const f of files) {
      const abs = path.join(chunksDir, f);
      const raw = fs.readFileSync(abs, 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      const title = meta.title || f;
      const sourceFile = meta.source_file || '';
      const text = body.slice(0, 2400).trim();
      if (!text) continue;

      docs.push({
        id: f.replace(/\.md$/i, ''),
        title,
        sourceFile,
        text,
      });
    }

    cached = { docs, loadedAtMs: Date.now() };
  }

  const scored = cached.docs
    .map((d) => {
      const textLower = `${d.title}\n${d.text}`.toLowerCase();
      return { d, score: scoreText(textLower, tokens) + (textLower.includes(tokens[0] || '') ? 1 : 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (!scored.length) return undefined;

  const sources = scored.map((x) => ({
    id: x.d.id,
    title: x.d.title,
    sourceFile: x.d.sourceFile,
  }));

  const context =
    'Toby transcript excerpts (use as grounding; if not relevant, ignore):\n' +
    scored
      .map((x, i) => {
        const label = String.fromCharCode(65 + i);
        const src = x.d.sourceFile ? `source_file=${x.d.sourceFile}` : `chunk_id=${x.d.id}`;
        return `[${label}] ${src}\n${x.d.text}`;
      })
      .join('\n\n');

  return { context, sources };
}
