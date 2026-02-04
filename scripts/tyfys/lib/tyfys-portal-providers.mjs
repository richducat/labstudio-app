import vm from 'node:vm';

function extractJsArray({ js, varName }) {
  const needle = `const ${varName} = [`;
  const start = js.indexOf(needle);
  if (start === -1) throw new Error(`Could not find ${needle}`);

  // Find the opening '['
  let i = start + needle.length - 1;
  if (js[i] !== '[') throw new Error(`Parser bug: expected '[' at ${i}`);

  // Match brackets while respecting strings.
  let depth = 0;
  let inS = false;
  let inD = false;
  let inB = false;
  let esc = false;

  const begin = i;
  for (; i < js.length; i++) {
    const ch = js[i];

    if (esc) {
      esc = false;
      continue;
    }
    if (ch === '\\') {
      if (inS || inD || inB) esc = true;
      continue;
    }

    if (!inD && !inB && ch === "'") inS = !inS;
    else if (!inS && !inB && ch === '"') inD = !inD;
    else if (!inS && !inD && ch === '`') inB = !inB;

    if (inS || inD || inB) continue;

    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        const end = i;
        return js.slice(begin, end + 1);
      }
    }
  }

  throw new Error(`Could not find end of array for ${varName}`);
}

export async function fetchTyfysPortalProviders() {
  const res = await fetch('https://tyfys.net/drportal.html');
  if (!res.ok) throw new Error(`Failed to fetch drportal.html (${res.status})`);
  const html = await res.text();

  // The React app is embedded inline; the provider list is in a const.
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  if (!scripts.length) throw new Error('No inline scripts found in drportal.html');

  // Heuristic: the big script contains provider objects with ids like al-1.
  const appScript = scripts.find(s => s.includes("const initialProviders") && s.includes("id: 'al-1'"));
  if (!appScript) throw new Error('Could not locate portal app script containing initialProviders');

  const arraySrc = extractJsArray({ js: appScript, varName: 'initialProviders' });

  // Evaluate in a clean sandbox.
  // NOTE: The array is plain data (object literals). This should be safe as long as we only evaluate this extracted snippet.
  const providers = vm.runInNewContext(`(${arraySrc})`, {}, { timeout: 1000 });
  if (!Array.isArray(providers)) throw new Error('Parsed initialProviders is not an array');

  // Normalize shape
  return providers.map(p => ({
    id: p.id,
    name: p.name,
    state: p.state,
    county: p.county,
    type: p.type,
    specialty: Array.isArray(p.specialty) ? p.specialty : [],
    services: p.services || '',
    contact: p.contact || '',
    phone: p.phone || '',
    email: p.email || '',
    notes: p.notes || '',
  }));
}

export function norm(s) {
  return String(s || '').trim().toLowerCase();
}

export function providerLooksCompetitor(p) {
  const n = norm(p.name);
  const block = [
    'vetlink',
    'ree medical',
    'prestige veteran',
    'prestige veteran medical',
    'prestige veteran medical consulting',
  ];
  return block.some(b => n.includes(b));
}

export function providerToOneLine(p) {
  const loc = [p.county, p.state].filter(Boolean).join(', ');
  const spec = (p.specialty || []).slice(0, 4).join(' / ');
  const contact = [p.email, p.phone, p.contact].filter(Boolean).join(' | ');
  return `${p.name}${loc ? ` — ${loc}` : ''}${spec ? ` — ${spec}` : ''}${p.services ? ` — ${p.services}` : ''}${contact ? ` — ${contact}` : ''}`;
}
