// Plant identification. Provider order: Pl@ntNet -> Claude vision -> built-in colour-profile matcher.
const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const genusSpecies = (s) => norm(s).split(' ').slice(0, 2).join(' ');

function matchByBotanical(plants, sciName) {
  const target = genusSpecies(sciName);
  if (!target) return null;
  return plants.find((p) => {
    const b = norm(p.botanical_name);
    return b.startsWith(target) || genusSpecies(p.botanical_name) === target || b.includes(target);
  });
}

/* ---------- Pl@ntNet ---------- */
async function viaPlantNet(plants, file, organ) {
  const key = process.env.PLANTNET_API_KEY;
  if (!key) return null;
  const fd = new FormData();
  fd.append('images', new Blob([file.buffer], { type: file.mimetype }), file.originalname || 'plant.jpg');
  fd.append('organs', ['leaf', 'flower', 'fruit', 'bark', 'auto'].includes(organ) ? organ : 'auto');
  const r = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(key)}&lang=en&nb-results=8`, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`PlantNet ${r.status}`);
  const data = await r.json();
  const matches = []; const external = [];
  for (const res of data.results || []) {
    const sci = res.species?.scientificNameWithoutAuthor;
    const p = matchByBotanical(plants, sci);
    if (p && !matches.find((m) => m.plant.id === p.id)) matches.push({ plant: p, confidence: res.score });
    else if (!p) external.push({ scientific_name: sci, common_names: res.species?.commonNames?.slice(0, 3) || [], confidence: res.score });
  }
  return { method: 'plantnet', label: 'Pl@ntNet AI', matches, external };
}

/* ---------- Claude vision ---------- */
async function viaClaude(plants, file) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const list = plants.map((p) => `${p.slug} = ${p.common_name} (${p.botanical_name})`).join('\n');
  const body = {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: file.mimetype, data: file.buffer.toString('base64') } },
        { type: 'text', text: `Identify the plant in this photo. Choose the best matches ONLY from this list (use the slug), or [] if none fits:\n${list}\n\nAnswer with JSON only: {"matches":[{"slug":"...","confidence":0.0-1.0}],"other_species":"scientific name if the plant is clearly something not in the list, else null"}` },
      ],
    }],
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}`);
  const data = await r.json();
  const text = (data.content || []).map((c) => c.text || '').join('');
  const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  const matches = (parsed.matches || []).map((m) => ({ plant: plants.find((p) => p.slug === m.slug), confidence: Number(m.confidence) || 0.5 })).filter((m) => m.plant);
  const external = parsed.other_species ? [{ scientific_name: parsed.other_species, common_names: [], confidence: null }] : [];
  return { method: 'claude', label: 'Claude vision', matches, external };
}

/* ---------- Built-in colour-profile matcher (no keys needed) ---------- */
const hexToHue = (hex) => {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return { h: 0, s: 0, l: (mx + mn) / 2 };
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: ((h * 60) + 360) % 360, s: d / (1 - Math.abs(mx + mn - 1)), l: (mx + mn) / 2 };
};
const BINS = 12;
function addGauss(hist, hue, w) {
  for (let i = 0; i < BINS; i++) {
    const c = i * 30 + 15; let d = Math.abs(c - hue); d = Math.min(d, 360 - d);
    hist[i] += w * Math.exp(-(d * d) / (2 * 28 * 28));
  }
}
function plantProfile(p) {
  const m = p.model_spec || {}; const h = new Array(BINS).fill(0);
  const leaf = hexToHue(m.leaf?.color || '#4f8f3a'); addGauss(h, leaf.h, 0.62);
  if (m.flower?.color) addGauss(h, hexToHue(m.flower.color).h, m.key_part === 'flower' ? 0.34 : 0.2);
  if (m.fruit?.color) addGauss(h, hexToHue(m.fruit.color).h, m.key_part === 'fruit' ? 0.3 : 0.12);
  if (m.root?.color) addGauss(h, hexToHue(m.root.color).h, m.key_part === 'root' ? 0.34 : 0.1);
  if (m.stem) addGauss(h, hexToHue(m.stem).h, 0.08);
  const sum = h.reduce((a, b) => a + b, 0) || 1;
  return h.map((x) => x / sum);
}
function viaProfile(plants, features, hint) {
  if (!features || !Array.isArray(features.hue) || features.hue.length !== BINS) return null;
  const hue = features.hue; const hs = hue.reduce((a, b) => a + b, 0) || 1;
  const img = hue.map((x) => x / hs);
  const h = norm(hint);
  const scored = plants.map((p) => {
    const prof = plantProfile(p);
    let s = 0; for (let i = 0; i < BINS; i++) s += Math.min(img[i], prof[i]);
    const m = p.model_spec || {};
    if (features.flowerFrac > 0.12 && m.flower) s += 0.06;
    if (features.flowerFrac < 0.04 && !m.flower) s += 0.04;
    if (features.brownFrac > 0.25 && ['root', 'bark'].includes(m.key_part)) s += 0.08;
    if (features.edge > 0.5 && ['grass', 'rosette'].includes(m.archetype)) s += 0.03;
    if (h && h.length > 2) {
      if (norm([p.common_name, p.botanical_name, p.sanskrit_name, ...(p.other_names || [])].join(' ')).includes(h)) s += 0.5;
      if (norm(p.common_name).split(' ')[0] === h.split(' ')[0] || norm(p.botanical_name).startsWith(h)) s += 0.6; // exact-name hint wins
    }
    return { plant: p, raw: s };
  }).sort((a, b) => b.raw - a.raw);
  const top = scored.slice(0, 5); const max = top[0]?.raw || 1;
  const matches = top.map((t) => ({ plant: t.plant, confidence: Math.min(0.85, +(t.raw / (max + 0.35) * 0.8).toFixed(2)) }));
  return { method: 'colour-profile', label: 'Built-in colour matcher (demo)', matches, external: [], note: 'This matcher only compares colours. Add a PLANTNET_API_KEY for real AI identification.' };
}

async function identify(plants, { file, features, hint, organ }) {
  const errors = [];
  for (const fn of [() => viaPlantNet(plants, file, organ), () => viaClaude(plants, file)]) {
    try { const r = await fn(); if (r) return { ...r, errors }; } catch (e) { errors.push(e.message); }
  }
  const r = viaProfile(plants, features, hint);
  return r ? { ...r, errors } : { method: 'none', label: 'No matcher available', matches: [], external: [], errors };
}

module.exports = { identify, viaProfile, matchByBotanical, plantProfile };
